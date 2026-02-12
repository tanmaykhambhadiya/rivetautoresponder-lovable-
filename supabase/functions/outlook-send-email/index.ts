import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendEmailRequest {
  to: string;
  subject: string;
  body: string;
  isHtml?: boolean;
  replyTo?: string; // Message ID to reply to
  attachments?: Array<{
    name: string;
    contentType: string;
    contentBytes: string; // Base64 encoded
  }>;
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

    const { to, subject, body, isHtml, replyTo, attachments }: SendEmailRequest = await req.json();

    if (!to || !subject || !body) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: to, subject, body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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

    // Build email payload
    const emailPayload: Record<string, unknown> = {
      message: {
        subject,
        body: {
          contentType: isHtml ? "HTML" : "Text",
          content: body,
        },
        toRecipients: [
          {
            emailAddress: { address: to },
          },
        ],
      },
      saveToSentItems: true,
    };

    // Add attachments if provided
    if (attachments && attachments.length > 0) {
      (emailPayload.message as Record<string, unknown>).attachments = attachments.map(att => ({
        "@odata.type": "#microsoft.graph.fileAttachment",
        name: att.name,
        contentType: att.contentType,
        contentBytes: att.contentBytes,
      }));
    }

    // If replying, we need to use the reply endpoint instead
    let sendUrl = "https://graph.microsoft.com/v1.0/me/sendMail";
    
    if (replyTo) {
      // For replies, we create a reply and then send
      sendUrl = `https://graph.microsoft.com/v1.0/me/messages/${replyTo}/reply`;
      // Reply payload is different
      const replyPayload = {
        message: {
          body: {
            contentType: isHtml ? "HTML" : "Text",
            content: body,
          },
        },
        comment: body,
      };
      
      const response = await fetch(sendUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(replyPayload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Failed to send reply:", errorText);
        throw new Error("Failed to send reply");
      }

      return new Response(
        JSON.stringify({ success: true, message: "Reply sent successfully" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send the email
    const sendResponse = await fetch(sendUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailPayload),
    });

    if (!sendResponse.ok) {
      const errorText = await sendResponse.text();
      console.error("Failed to send email:", errorText);
      throw new Error("Failed to send email");
    }

    return new Response(
      JSON.stringify({ success: true, message: "Email sent successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in outlook-send-email:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
