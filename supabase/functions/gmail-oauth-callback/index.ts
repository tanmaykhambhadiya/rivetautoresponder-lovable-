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
    const clientSecret = Deno.env.get("GMAIL_CLIENT_SECRET");
    
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

    // Get client_id from system_settings
    const { data: settings, error: settingsError } = await supabase
      .from("system_settings")
      .select("key, value")
      .in("key", ["gmail_client_id"]);

    if (settingsError) throw settingsError;

    const clientId = settings?.find(s => s.key === "gmail_client_id")?.value;

    if (!clientId || !clientSecret) {
      return createRedirectResponse("/settings?error=Gmail+not+configured.+Please+set+Client+ID+and+add+GMAIL_CLIENT_SECRET+to+backend+secrets.");
    }

    const redirectUri = `${supabaseUrl}/functions/v1/gmail-oauth-callback`;

    // Exchange code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: String(clientId),
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("Token exchange failed:", errorText);
      return createRedirectResponse(`/settings?error=${encodeURIComponent("Failed to exchange code for tokens")}`);
    }

    const tokens = await tokenResponse.json();
    const { access_token, refresh_token, expires_in } = tokens;

    if (!refresh_token) {
      return createRedirectResponse("/settings?error=No+refresh+token+received.+Make+sure+access_type=offline+is+included.");
    }

    // Get user email from Google
    const userResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    if (!userResponse.ok) {
      const errorText = await userResponse.text();
      console.error("Failed to get user info:", errorText);
      return createRedirectResponse(`/settings?error=${encodeURIComponent("Failed to get user email")}`);
    }

    const userInfo = await userResponse.json();
    const email = userInfo.email;

    // Calculate expiry time
    const expiresAt = new Date(Date.now() + (expires_in * 1000)).toISOString();

    // Use the secure upsert function to store encrypted tokens
    const { error: upsertError } = await supabase.rpc('upsert_email_account', {
      p_user_id: userId,
      p_provider: "gmail",
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

    console.log("Gmail OAuth successful for user:", userId, "email:", email, "(tokens encrypted)");
    return createRedirectResponse(`/settings?success=Gmail+connected+successfully&email=${encodeURIComponent(email)}`);

  } catch (error: unknown) {
    console.error("Error in gmail-oauth-callback:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return createRedirectResponse(`/settings?error=${encodeURIComponent(message)}`);
  }
});

function createRedirectResponse(path: string): Response {
  const frontendUrl = Deno.env.get("FRONTEND_URL") || "https://ajaegyvfielffgajuodc.lovable.app";
  return new Response(null, {
    status: 302,
    headers: {
      Location: `${frontendUrl}${path}`,
    },
  });
}
