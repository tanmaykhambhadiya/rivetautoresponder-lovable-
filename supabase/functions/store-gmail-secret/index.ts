import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { clientSecret, disconnect } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // For disconnect, clear the stored secret
    if (disconnect) {
      await supabase
        .from("system_settings")
        .delete()
        .eq("key", "gmail_client_secret_encoded");
      
      console.log("Gmail disconnection - secret cleared");
      return new Response(
        JSON.stringify({ success: true, message: "Gmail disconnected" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!clientSecret) {
      return new Response(
        JSON.stringify({ error: "Client secret is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Store client secret in database (base64 encoded for basic obfuscation)
    const encodedSecret = btoa(clientSecret);
    
    const { data: existing } = await supabase
      .from("system_settings")
      .select("id")
      .eq("key", "gmail_client_secret_encoded")
      .single();

    if (existing) {
      await supabase
        .from("system_settings")
        .update({ value: encodedSecret })
        .eq("key", "gmail_client_secret_encoded");
    } else {
      await supabase
        .from("system_settings")
        .insert({ key: "gmail_client_secret_encoded", value: encodedSecret });
    }

    console.log("Gmail client secret stored in database");

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Gmail client secret stored successfully" 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error storing Gmail secret:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});