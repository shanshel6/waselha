import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ADMIN_USER_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
const ADMIN_PHONE = '+9647779786420';
const ADMIN_PASSWORD = '199806';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: 'Supabase environment not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1. Check if user already exists by ID
    const { data: existingUser, error: fetchError } = await adminClient.auth.admin.getUserById(ADMIN_USER_ID);

    if (fetchError && fetchError.message !== 'User not found') {
        console.error('Error checking existing user:', fetchError);
        throw new Error('Failed to check existing user.');
    }

    let user;
    if (existingUser?.user) {
        user = existingUser.user;
        console.log('Admin user already exists. Skipping creation.');
    } else {
        // 2. Create the user with the fixed ID, phone, and password
        const { data: creationData, error: creationError } = await adminClient.auth.admin.createUser({
            phone: ADMIN_PHONE,
            password: ADMIN_PASSWORD,
            phone_confirm: true, // Auto-confirm phone
            id: ADMIN_USER_ID,
            user_metadata: {
                first_name: 'Admin',
                last_name: 'User',
                phone: '07779786420',
                role: 'both',
                is_admin: true
            }
        });

        if (creationError) {
            console.error('Error creating admin user:', creationError);
            throw new Error(creationError.message);
        }
        user = creationData.user;
        console.log('Admin user created successfully.');
    }
    
    // 3. Ensure profile and password records exist (using admin client upsert)
    
    // Insert/Update password record
    const { error: passwordError } = await adminClient
        .from('user_passwords')
        .upsert({
            id: ADMIN_USER_ID,
            password: ADMIN_PASSWORD,
            created_at: new Date().toISOString()
        }, { onConflict: 'id' });

    if (passwordError) {
        console.error('Error upserting admin password:', passwordError);
        throw new Error('Failed to configure admin password.');
    }

    // Insert/Update profile record
    const { error: profileError } = await adminClient
        .from('profiles')
        .upsert({
            id: ADMIN_USER_ID,
            first_name: 'Admin',
            last_name: 'User',
            phone: '07779786420',
            role: 'both',
            is_admin: true,
            updated_at: new Date().toISOString()
        }, { onConflict: 'id' });

    if (profileError) {
        console.error('Error upserting admin profile:', profileError);
        throw new Error('Failed to configure admin profile.');
    }


    return new Response(
      JSON.stringify({ success: true, userId: user.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );

  } catch (error) {
    console.error('create-admin-user unexpected error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});