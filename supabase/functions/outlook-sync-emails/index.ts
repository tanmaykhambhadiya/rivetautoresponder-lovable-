import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OutlookMessage {
  id: string;
  receivedDateTime: string;
  subject: string;
  bodyPreview: string;
  body: { content: string; contentType: string };
  from: { emailAddress: { address: string; name: string } };
  importance: string;
  hasAttachments: boolean;
  isRead: boolean;
}

async function refreshAccessToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string,
  tenantId: string
): Promise<{ access_token: string; expires_in: number }> {
  const response = await fetch(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
        scope: "offline_access Mail.Read Mail.Send Mail.ReadWrite User.Read",
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to refresh token: ${error}`);
  }

  return response.json();
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Authenticate user
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

    // Get user's email account from decrypted view (tokens are automatically decrypted)
    const { data: emailAccount, error: accountError } = await supabase
      .from("email_accounts_decrypted")
      .select("*")
      .eq("user_id", user.id)
      .eq("provider", "outlook")
      .single();

    if (accountError || !emailAccount) {
      return new Response(
        JSON.stringify({ error: "Outlook not connected. Please connect your Outlook account first." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const organizationId = emailAccount.organization_id;

    // Get client_id, tenant_id, and client_secret from system_settings
    const { data: settings } = await supabase
      .from("system_settings")
      .select("key, value")
      .in("key", ["outlook_client_id", "outlook_tenant_id", "outlook_client_secret_encrypted"]);

    const clientId = settings?.find((s) => s.key === "outlook_client_id")?.value;
    const tenantId = settings?.find((s) => s.key === "outlook_tenant_id")?.value || "common";
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

    if (!clientId || !clientSecret) {
      return new Response(
        JSON.stringify({ error: "Outlook not configured by administrator" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if token is expired and refresh if needed
    let accessToken = emailAccount.access_token;
    const expiresAt = emailAccount.expires_at ? new Date(emailAccount.expires_at) : null;
    
    if (!accessToken || !expiresAt || expiresAt <= new Date()) {
      console.log("Refreshing access token for user:", user.id);
      const tokens = await refreshAccessToken(
        emailAccount.refresh_token,
        String(clientId),
        clientSecret,
        String(tenantId)
      );

      accessToken = tokens.access_token;
      const newExpiresAt = new Date(Date.now() + (tokens.expires_in * 1000)).toISOString();

      // Update stored tokens using the secure function (encrypts automatically)
      await supabase.rpc('update_access_token', {
        p_account_id: emailAccount.id,
        p_access_token: accessToken,
        p_expires_at: newExpiresAt
      });
    }

    // Fetch emails from Microsoft Graph
    const messagesResponse = await fetch(
      "https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages?$top=50&$orderby=receivedDateTime desc&$select=id,receivedDateTime,subject,bodyPreview,body,from,importance,hasAttachments,isRead",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!messagesResponse.ok) {
      const errorText = await messagesResponse.text();
      console.error("Failed to fetch emails:", errorText);
      throw new Error("Failed to fetch emails from Outlook");
    }

    const messagesData = await messagesResponse.json();
    const messages: OutlookMessage[] = messagesData.value || [];

    // Classify emails
    function classifyEmail(subject: string, body: string): string {
      const text = `${subject} ${body}`.toLowerCase();
      if (text.includes("shift") && (text.includes("available") || text.includes("cover") || text.includes("request"))) {
        return "nhs_shift_asking";
      }
      if (text.includes("shift") && (text.includes("confirmed") || text.includes("accepted") || text.includes("booked"))) {
        return "nhs_shift_confirmed";
      }
      return "other";
    }

    // Upsert emails to database
    let syncedCount = 0;
    const errors: string[] = [];

    for (const message of messages) {
      const category = classifyEmail(message.subject || "", message.bodyPreview || "");
      
      const { error: upsertError } = await supabase
        .from("inbox_emails")
        .upsert(
          {
            user_id: user.id,
            provider: 'outlook',
            outlook_message_id: message.id,
            from_email: message.from?.emailAddress?.address || "unknown",
            from_name: message.from?.emailAddress?.name || null,
            subject: message.subject || null,
            body_preview: message.bodyPreview || null,
            body: message.body?.content || null,
            received_at: message.receivedDateTime,
            is_read: message.isRead,
            has_attachments: message.hasAttachments,
            importance: message.importance,
            category,
            synced_at: new Date().toISOString(),
            organization_id: organizationId,
          },
          { onConflict: "outlook_message_id" }
        );

      if (upsertError) {
        errors.push(`Failed to sync email ${message.id}: ${upsertError.message}`);
      } else {
        syncedCount++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        synced: syncedCount,
        total: messages.length,
        errors: errors.length > 0 ? errors : undefined,
        message: `Synced ${syncedCount} emails`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in outlook-sync-emails:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
