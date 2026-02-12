import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function getAccessToken(clientId: string, clientSecret: string, refreshToken: string): Promise<string> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to refresh token: ${error}`);
  }

  const data = await response.json();
  return data.access_token;
}

function createRawEmail(to: string, subject: string, body: string, fromEmail: string): string {
  const email = [
    `From: ${fromEmail}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'Content-Type: text/html; charset=utf-8',
    '',
    body,
  ].join('\r\n');

  // Base64 URL encode
  const base64 = btoa(email);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, subject, body, user_id } = await req.json();

    if (!to || !subject || !body) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: to, subject, body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get Gmail settings
    const { data: settings, error: settingsError } = await supabase
      .from("system_settings")
      .select("*")
      .in("key", ["gmail_client_id"]);

    if (settingsError) throw settingsError;

    const clientId = settings?.find(s => s.key === "gmail_client_id")?.value;
    const clientSecret = Deno.env.get("GMAIL_CLIENT_SECRET");

    if (!clientId || !clientSecret) {
      return new Response(
        JSON.stringify({ error: "Gmail not configured. Please set up the admin configuration first." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get Gmail account from decrypted view (tokens are automatically decrypted)
    let query = supabase
      .from("email_accounts_decrypted")
      .select("*")
      .eq("provider", "gmail");
    
    if (user_id) {
      query = query.eq("user_id", user_id);
    }
    
    const { data: emailAccount, error: accountError } = await query.limit(1).single();

    if (accountError || !emailAccount?.refresh_token) {
      console.error("Gmail account error:", accountError);
      return new Response(
        JSON.stringify({ error: "Gmail not connected. Please connect your Gmail account first." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const fromEmail = emailAccount.email;
    const refreshToken = emailAccount.refresh_token;

    // Get access token
    const accessToken = await getAccessToken(clientId, clientSecret, refreshToken);

    // Update the stored access token using the secure function (encrypts automatically)
    const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();
    await supabase.rpc('update_access_token', {
      p_account_id: emailAccount.id,
      p_access_token: accessToken,
      p_expires_at: expiresAt
    });

    // Create raw email
    const raw = createRawEmail(to, subject, body, fromEmail);

    // Send email
    const sendResponse = await fetch(
      "https://www.googleapis.com/gmail/v1/users/me/messages/send",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ raw }),
      }
    );

    if (!sendResponse.ok) {
      const error = await sendResponse.text();
      throw new Error(`Failed to send email: ${error}`);
    }

    const result = await sendResponse.json();

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: result.id,
        message: "Email sent successfully"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Gmail send failed:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
