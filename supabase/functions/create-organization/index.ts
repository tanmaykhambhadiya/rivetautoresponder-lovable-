import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { 
        global: { headers: { Authorization: authHeader } },
        auth: { autoRefreshToken: false, persistSession: false }
      }
    );

    const { data: { user: requestingUser }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !requestingUser) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Only super admin can create organizations
    if (requestingUser.email !== 'rivetglobalai@gmail.com') {
      return new Response(
        JSON.stringify({ error: 'Only super admin can create organizations' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { name, slug, adminEmail, adminPassword, adminFullName } = await req.json();

    if (!name || !slug) {
      return new Response(
        JSON.stringify({ error: 'Organization name and slug are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create the organization
    const { data: org, error: orgError } = await supabaseAdmin
      .from('organizations')
      .insert({ name, slug })
      .select()
      .single();

    if (orgError) {
      console.error('Error creating organization:', orgError);
      return new Response(
        JSON.stringify({ error: orgError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let adminUser = null;

    // Create admin user if credentials provided
    if (adminEmail && adminPassword) {
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: adminEmail,
        password: adminPassword,
        email_confirm: true,
        user_metadata: { full_name: adminFullName || '' }
      });

      if (createError) {
        console.error('Error creating admin user:', createError);
        // Still return success for org creation
      } else if (newUser.user) {
        adminUser = newUser.user;

        // Update profile with organization_id
        await supabaseAdmin
          .from('profiles')
          .update({ organization_id: org.id })
          .eq('id', newUser.user.id);

        // Assign admin role
        await supabaseAdmin
          .from('user_roles')
          .insert({ user_id: newUser.user.id, role: 'admin' });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        organization: org,
        adminUser: adminUser ? { 
          id: adminUser.id, 
          email: adminUser.email 
        } : null
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in create-organization function:', error);
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
