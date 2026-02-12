import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface StoreSecretRequest {
  clientSecret?: string | null;
  disconnect?: boolean;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the user is authenticated and is an admin
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

    // Check if user is admin or super_admin
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["admin", "super_admin"])
      .limit(1);

    if (!roleData || roleData.length === 0) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { clientSecret, disconnect }: StoreSecretRequest = await req.json();

    if (disconnect) {
      // Clear the stored secret when disconnecting
      await supabase
        .from("system_settings")
        .delete()
        .eq("key", "outlook_client_secret_encrypted");
      
      console.log("Outlook secret cleared by user");
      return new Response(
        JSON.stringify({ success: true, message: "Outlook disconnected" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!clientSecret) {
      return new Response(
        JSON.stringify({ error: "Client secret is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Store the client secret in system_settings
    // Note: In production, you'd want to encrypt this value
    // For now, we'll base64 encode it as a basic obfuscation
    const encodedSecret = btoa(clientSecret);
    
    const { data: existing } = await supabase
      .from("system_settings")
      .select("id")
      .eq("key", "outlook_client_secret_encrypted")
      .single();

    if (existing) {
      const { error: updateError } = await supabase
        .from("system_settings")
        .update({ 
          value: encodedSecret,
          updated_at: new Date().toISOString()
        })
        .eq("key", "outlook_client_secret_encrypted");
      
      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await supabase
        .from("system_settings")
        .insert({ 
          key: "outlook_client_secret_encrypted", 
          value: encodedSecret 
        });
      
      if (insertError) throw insertError;
    }
    
    console.log("Outlook client secret stored successfully");

    return new Response(
      JSON.stringify({ success: true, message: "Client secret stored successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in store-outlook-secret:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
