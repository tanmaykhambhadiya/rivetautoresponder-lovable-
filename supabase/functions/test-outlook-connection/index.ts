import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the user is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get stored credentials from system_settings
    const { data: settings, error: settingsError } = await supabase
      .from("system_settings")
      .select("key, value")
      .in("key", ["outlook_client_id", "outlook_tenant_id", "outlook_email", "outlook_client_secret_encrypted"]);

    if (settingsError) {
      throw new Error("Failed to fetch settings: " + settingsError.message);
    }

    const clientId = settings?.find((s) => s.key === "outlook_client_id")?.value;
    const tenantId = settings?.find((s) => s.key === "outlook_tenant_id")?.value;
    const targetEmail = settings?.find((s) => s.key === "outlook_email")?.value;
    const encodedSecret = settings?.find((s) => s.key === "outlook_client_secret_encrypted")?.value;

    // Try DB secret first, then fall back to environment variable
    let clientSecret: string | undefined;
    if (encodedSecret && typeof encodedSecret === "string") {
      try {
        clientSecret = atob(encodedSecret);
      } catch {
        console.warn("Failed to decode stored Outlook secret, falling back to env var");
      }
    }

    if (!clientSecret) {
      clientSecret = Deno.env.get("MICROSOFT_CLIENT_SECRET") || undefined;
    }

    if (!clientId || !tenantId || !clientSecret) {
      return new Response(
        JSON.stringify({ error: "Outlook credentials not configured. Please enter Client ID, Tenant ID, and a valid Client Secret." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Authenticate with Microsoft using Client Credentials flow
    const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
    
    const tokenParams = new URLSearchParams({
      client_id: clientId as string,
      client_secret: clientSecret,
      scope: "https://graph.microsoft.com/.default",
      grant_type: "client_credentials",
    });

    console.log("Requesting access token from Microsoft...");
    
    const tokenResponse = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: tokenParams.toString(),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error("Token request failed:", errorData);
      return new Response(
        JSON.stringify({ 
          error: `Authentication failed: ${errorData.error_description || errorData.error || "Unknown error"}` 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    console.log("Access token obtained successfully");

    // Test the connection by fetching mailbox info
    // If targetEmail is set, use that; otherwise, get organization info
    let email = targetEmail;
    let displayName = "Organization Mailbox";

    if (targetEmail) {
      // Verify the mailbox exists and is accessible
      const mailboxUrl = `https://graph.microsoft.com/v1.0/users/${targetEmail}/mailFolders/inbox`;
      const mailboxResponse = await fetch(mailboxUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!mailboxResponse.ok) {
        const errorData = await mailboxResponse.json();
        console.error("Mailbox access failed:", errorData);
        return new Response(
          JSON.stringify({ 
            error: `Cannot access mailbox for ${targetEmail}. Ensure the app has Mail.Read permission for this user.` 
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get user display name
      const userUrl = `https://graph.microsoft.com/v1.0/users/${targetEmail}`;
      const userResponse = await fetch(userUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (userResponse.ok) {
        const userData = await userResponse.json();
        displayName = userData.displayName || targetEmail;
      }
    } else {
      // No target email set - prompt user to set one
      return new Response(
        JSON.stringify({ 
          error: "Please set the target mailbox email address in system settings (outlook_email)" 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update connection status in database
    const now = new Date().toISOString();
    
    // Update outlook_connected
    const { error: connError } = await supabase
      .from("system_settings")
      .upsert({ key: "outlook_connected", value: true, updated_at: now }, { onConflict: "key" });

    if (connError) console.error("Error updating outlook_connected:", connError);

    // Update last sync time
    const { error: syncError } = await supabase
      .from("system_settings")
      .upsert({ key: "outlook_last_sync", value: now, updated_at: now }, { onConflict: "key" });

    if (syncError) console.error("Error updating outlook_last_sync:", syncError);

    console.log("Outlook connection test successful for:", email);

    return new Response(
      JSON.stringify({ 
        success: true, 
        email: email,
        displayName: displayName,
        message: "Connection successful" 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in test-outlook-connection:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
