import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function refreshAccessToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string
): Promise<{ access_token: string; expires_in: number }> {
  console.log("Refreshing Gmail access token...");
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Token refresh failed:", error);
    throw new Error(`Failed to refresh token: ${error}`);
  }

  const tokens = await response.json();
  console.log("Token refreshed successfully");
  return tokens;
}

function parseEmailAddress(headerValue: string): { email: string; name: string | null } {
  if (!headerValue) return { email: "unknown", name: null };
  const match = headerValue.match(/^(?:(.+?)\s*)?<?([^\s<>]+@[^\s<>]+)>?$/);
  if (match) {
    return {
      name: match[1]?.replace(/^["']|["']$/g, '').trim() || null,
      email: match[2],
    };
  }
  return { email: headerValue, name: null };
}

function decodeBase64Url(data: string): string {
  if (!data) return '';
  const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - base64.length % 4) % 4);
  try {
    return decodeURIComponent(escape(atob(base64 + padding)));
  } catch {
    try {
      return atob(base64 + padding);
    } catch {
      return data;
    }
  }
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("Gmail sync started");

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const clientSecret = Deno.env.get("GMAIL_CLIENT_SECRET");

    console.log("Environment check - URL:", !!supabaseUrl, "ServiceKey:", !!supabaseServiceKey, "ClientSecret:", !!clientSecret);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("No authorization header");
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("User authenticated:", user.id);

    // Get user's Gmail account from decrypted view (tokens are automatically decrypted)
    const { data: emailAccount, error: accountError } = await supabase
      .from("email_accounts_decrypted")
      .select("*")
      .eq("user_id", user.id)
      .eq("provider", "gmail")
      .single();

    if (accountError || !emailAccount) {
      console.error("No Gmail account found:", accountError);
      return new Response(
        JSON.stringify({ error: "Gmail not connected. Please connect your Gmail account first." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Gmail account found:", emailAccount.email);
    const organizationId = emailAccount.organization_id;

    // Get client_id from system_settings
    const { data: settings } = await supabase
      .from("system_settings")
      .select("key, value")
      .in("key", ["gmail_client_id"]);

    const clientId = settings?.find(s => s.key === "gmail_client_id")?.value;

    if (!clientId || !clientSecret) {
      console.error("Gmail not configured - clientId:", !!clientId, "clientSecret:", !!clientSecret);
      return new Response(
        JSON.stringify({ error: "Gmail not configured by administrator. Please set GMAIL_CLIENT_SECRET in edge function secrets." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if token is expired and refresh if needed
    let accessToken = emailAccount.access_token;
    const expiresAt = emailAccount.expires_at ? new Date(emailAccount.expires_at) : null;
    
    if (!accessToken || !expiresAt || expiresAt <= new Date()) {
      console.log("Token expired or missing, refreshing...");
      try {
        const tokens = await refreshAccessToken(
          emailAccount.refresh_token,
          String(clientId),
          clientSecret
        );

        accessToken = tokens.access_token;
        const newExpiresAt = new Date(Date.now() + (tokens.expires_in * 1000)).toISOString();

        // Update stored tokens using the secure function (encrypts automatically)
        await supabase.rpc('update_access_token', {
          p_account_id: emailAccount.id,
          p_access_token: accessToken,
          p_expires_at: newExpiresAt
        });
        
        console.log("Token updated in database (encrypted)");
      } catch (refreshError) {
        console.error("Token refresh failed:", refreshError);
        return new Response(
          JSON.stringify({ error: `Token refresh failed: ${refreshError instanceof Error ? refreshError.message : 'Unknown error'}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Fetch recent messages from Gmail
    console.log("Fetching message list from Gmail...");
    const listResponse = await fetch(
      "https://www.googleapis.com/gmail/v1/users/me/messages?maxResults=50&labelIds=INBOX",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!listResponse.ok) {
      const errorText = await listResponse.text();
      console.error("Gmail API list error:", listResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: `Gmail API error (${listResponse.status}): ${errorText}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const listData = await listResponse.json();
    const messageIds = listData.messages || [];
    console.log(`Found ${messageIds.length} messages in inbox`);

    if (messageIds.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          synced: 0,
          skipped: 0,
          message: "No emails found in inbox"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let syncedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    for (const msg of messageIds) {
      try {
        // Check if already synced for this user
        const { data: existing } = await supabase
          .from("inbox_emails")
          .select("id")
          .eq("outlook_message_id", `gmail_${msg.id}`)
          .eq("user_id", user.id)
          .maybeSingle();

        if (existing) {
          skippedCount++;
          continue;
        }

        // Get full message details
        console.log(`Fetching full message: ${msg.id}`);
        const msgResponse = await fetch(
          `https://www.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );

        if (!msgResponse.ok) {
          const errorText = await msgResponse.text();
          console.error(`Failed to fetch message ${msg.id}:`, errorText);
          errors.push(`Failed to fetch message ${msg.id}`);
          continue;
        }

        const msgData = await msgResponse.json();
        const headers = msgData.payload?.headers || [];

        const getHeader = (name: string) => 
          headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

        const fromHeader = getHeader('From');
        const { email: fromEmail, name: fromName } = parseEmailAddress(fromHeader);
        const subject = getHeader('Subject');
        const date = getHeader('Date');

        // Get body - try multiple approaches
        let body = '';
        const bodyPreview = msgData.snippet || '';

        const extractBody = (payload: any): string => {
          // Direct body data
          if (payload.body?.data) {
            return decodeBase64Url(payload.body.data);
          }
          // Multipart - look for text/plain or text/html
          if (payload.parts) {
            // First try plain text
            for (const part of payload.parts) {
              if (part.mimeType === 'text/plain' && part.body?.data) {
                return decodeBase64Url(part.body.data);
              }
            }
            // Then try HTML
            for (const part of payload.parts) {
              if (part.mimeType === 'text/html' && part.body?.data) {
                return decodeBase64Url(part.body.data);
              }
            }
            // Check nested parts (multipart/alternative)
            for (const part of payload.parts) {
              if (part.parts) {
                const nested = extractBody(part);
                if (nested) return nested;
              }
            }
          }
          return '';
        };

        body = extractBody(msgData.payload);

        const hasAttachments = msgData.payload?.parts?.some((p: any) => p.filename && p.filename.length > 0) || false;
        const isRead = !msgData.labelIds?.includes('UNREAD');
        const isStarred = msgData.labelIds?.includes('STARRED') || false;

        // Determine category
        let category = 'primary';
        if (msgData.labelIds?.includes('CATEGORY_PROMOTIONS')) category = 'promotions';
        else if (msgData.labelIds?.includes('CATEGORY_SOCIAL')) category = 'social';
        else if (msgData.labelIds?.includes('CATEGORY_UPDATES')) category = 'updates';

        // Parse received date
        let receivedAt: string;
        try {
          receivedAt = date ? new Date(date).toISOString() : new Date().toISOString();
        } catch {
          receivedAt = new Date().toISOString();
        }

        // Insert email with user_id, provider and organization_id
        console.log(`Inserting email: ${subject?.substring(0, 50)}...`);
        const { error: insertError } = await supabase
          .from("inbox_emails")
          .insert({
            user_id: user.id,
            provider: 'gmail',
            outlook_message_id: `gmail_${msg.id}`,
            from_email: fromEmail,
            from_name: fromName,
            subject: subject || '(No Subject)',
            body_preview: bodyPreview,
            body: body || bodyPreview,
            received_at: receivedAt,
            is_read: isRead,
            is_starred: isStarred,
            has_attachments: hasAttachments,
            category: category,
            importance: msgData.labelIds?.includes('IMPORTANT') ? 'high' : 'normal',
            synced_at: new Date().toISOString(),
            organization_id: organizationId,
          });

        if (insertError) {
          console.error(`Failed to insert email ${msg.id}:`, insertError);
          errors.push(`Insert failed: ${insertError.message}`);
        } else {
          syncedCount++;
          console.log(`Synced email ${syncedCount}: ${subject?.substring(0, 30)}`);
        }
      } catch (msgError) {
        console.error(`Error processing message ${msg.id}:`, msgError);
        errors.push(`Error processing ${msg.id}`);
      }
    }

    console.log(`Sync complete: ${syncedCount} synced, ${skippedCount} skipped, ${errors.length} errors`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        synced: syncedCount,
        skipped: skippedCount,
        total: messageIds.length,
        errors: errors.length > 0 ? errors : undefined,
        message: `Synced ${syncedCount} new emails, ${skippedCount} already synced`
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Gmail sync failed:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
