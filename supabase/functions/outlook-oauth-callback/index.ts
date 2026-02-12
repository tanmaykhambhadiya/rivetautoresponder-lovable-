import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state"); // Contains user_id
    const error = url.searchParams.get("error");
    const errorDescription = url.searchParams.get("error_description");

    if (error) {
      console.error("OAuth error:", error, errorDescription);
      return createRedirectResponse(`/settings?error=${encodeURIComponent(errorDescription || error)}`);
    }

    if (!code || !state) {
      return createRedirectResponse("/settings?error=Missing+authorization+code+or+state");
    }

    // Decode state to get user_id
    let userId: string;
    try {
      const stateData = JSON.parse(atob(state));
      userId = stateData.user_id;
    } catch {
      return createRedirectResponse("/settings?error=Invalid+state+parameter");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user's organization_id from profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", userId)
      .single();

    if (profileError) {
      console.error("Failed to get user profile:", profileError);
      return createRedirectResponse("/settings?error=Failed+to+get+user+profile");
    }

    const organizationId = profile?.organization_id;

    // Get client_id, tenant_id, and client_secret from system_settings
    const { data: settings, error: settingsError } = await supabase
      .from("system_settings")
      .select("key, value")
      .in("key", ["outlook_client_id", "outlook_tenant_id", "outlook_client_secret_encrypted"]);

    if (settingsError) throw settingsError;

    const clientId = settings?.find(s => s.key === "outlook_client_id")?.value;
    const tenantId = settings?.find(s => s.key === "outlook_tenant_id")?.value || "common";
    const encodedSecret = settings?.find(s => s.key === "outlook_client_secret_encrypted")?.value;
    
    // Try database first, then fall back to environment variable
    let clientSecret: string | undefined;
    if (encodedSecret && typeof encodedSecret === "string") {
      try {
        clientSecret = atob(encodedSecret);
      } catch {
        console.warn("Failed to decode stored secret, falling back to env var");
      }
    }
    
    // Fallback to environment variable if not in database
    if (!clientSecret) {
      clientSecret = Deno.env.get("MICROSOFT_CLIENT_SECRET");
    }

    if (!clientId || !clientSecret) {
      return createRedirectResponse("/settings?error=Outlook+not+configured.+Please+set+Client+ID+and+Client+Secret+in+admin+settings.");
    }

    const redirectUri = `${supabaseUrl}/functions/v1/outlook-oauth-callback`;

    // Exchange code for tokens
    const tokenResponse = await fetch(
      `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: String(clientId),
          client_secret: clientSecret,
          code,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
          scope: "offline_access Mail.Read Mail.Send Mail.ReadWrite User.Read",
        }),
      }
    );

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("Token exchange failed:", errorText);
      return createRedirectResponse(`/settings?error=${encodeURIComponent("Failed to exchange code for tokens")}`);
    }

    const tokens = await tokenResponse.json();
    const { access_token, refresh_token, expires_in } = tokens;

    if (!refresh_token) {
      return createRedirectResponse("/settings?error=No+refresh+token+received.+Make+sure+offline_access+scope+is+included.");
    }

    // Get user email from Microsoft Graph
    const userResponse = await fetch("https://graph.microsoft.com/v1.0/me", {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    if (!userResponse.ok) {
      const errorText = await userResponse.text();
      console.error("Failed to get user info:", errorText);
      return createRedirectResponse(`/settings?error=${encodeURIComponent("Failed to get user email")}`);
    }

    const userInfo = await userResponse.json();
    const email = userInfo.mail || userInfo.userPrincipalName;

    // Calculate expiry time
    const expiresAt = new Date(Date.now() + (expires_in * 1000)).toISOString();

    // Use the secure upsert function to store encrypted tokens
    const { error: upsertError } = await supabase.rpc('upsert_email_account', {
      p_user_id: userId,
      p_provider: "outlook",
      p_email: email,
      p_refresh_token: refresh_token,
      p_access_token: access_token,
      p_expires_at: expiresAt,
      p_organization_id: organizationId
    });

    if (upsertError) {
      console.error("Failed to save email account:", upsertError);
      return createRedirectResponse(`/settings?error=${encodeURIComponent("Failed to save account")}`);
    }

    console.log("Outlook OAuth successful for user:", userId, "email:", email, "(tokens encrypted)");
    return createRedirectResponse(`/settings?success=Outlook+connected+successfully&email=${encodeURIComponent(email)}`);

  } catch (error: unknown) {
    console.error("Error in outlook-oauth-callback:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return createRedirectResponse(`/settings?error=${encodeURIComponent(message)}`);
  }
});

function createRedirectResponse(path: string): Response {
  // Get the frontend URL from environment or use published URL
  const frontendUrl = Deno.env.get("FRONTEND_URL") || "https://rivetautoresponder.lovable.app";
  return new Response(null, {
    status: 302,
    headers: {
      Location: `${frontendUrl}${path}`,
    },
  });
}
