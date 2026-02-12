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
    const errorText = await response.text();
    // Common cause: refresh token was created for a different OAuth client, or the client secret is wrong.
    throw new Error(
      `Failed to refresh token: ${errorText}. ` +
        `Check that Client ID + Client Secret belong to the SAME Google OAuth app that issued the refresh token, and that the OAuth client is of type Web application.`
    );
  }

  const data = await response.json();
  return data.access_token;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get Gmail settings from system_settings
    const { data: settings, error: settingsError } = await supabase
      .from("system_settings")
      .select("*")
      .in("key", ["gmail_client_id"]);

    if (settingsError) throw settingsError;

    const clientIdRaw = settings?.find((s) => s.key === "gmail_client_id")?.value;
    const clientId = clientIdRaw ? String(clientIdRaw).trim() : null;
    const clientSecret = Deno.env.get("GMAIL_CLIENT_SECRET")?.trim();

    if (!clientId || !clientSecret) {
      return new Response(
        JSON.stringify({
          error: "Gmail not configured. Please enter Client ID in Settings and set GMAIL_CLIENT_SECRET in backend secrets.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Get Gmail account from decrypted view (tokens are automatically decrypted)
    const { data: emailAccount, error: accountError } = await supabase
      .from("email_accounts_decrypted")
      .select("*")
      .eq("provider", "gmail")
      .limit(1)
      .single();

    if (accountError || !emailAccount?.refresh_token) {
      return new Response(
        JSON.stringify({
          error: "Gmail not connected. Please connect your Gmail account first via the Connect Gmail button.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

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

    // Test by getting user profile
    const profileResponse = await fetch(
      "https://www.googleapis.com/gmail/v1/users/me/profile",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!profileResponse.ok) {
      const error = await profileResponse.text();
      throw new Error(`Gmail API error: ${error}`);
    }

    const profile = await profileResponse.json();

    // Update connection status
    const updates = [
      { key: "gmail_connected", value: true },
      { key: "gmail_email", value: profile.emailAddress },
    ];

    for (const update of updates) {
      const { data: existing } = await supabase
        .from("system_settings")
        .select("id")
        .eq("key", update.key)
        .single();

      if (existing) {
        await supabase
          .from("system_settings")
          .update({ value: update.value })
          .eq("key", update.key);
      } else {
        await supabase
          .from("system_settings")
          .insert({ key: update.key, value: update.value });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        email: profile.emailAddress,
        messagesTotal: profile.messagesTotal
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Gmail connection test failed:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
