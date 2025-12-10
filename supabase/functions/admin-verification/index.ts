import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        {
          status: 500,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Create admin client
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Authenticate admin user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        {
          status: 401,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Content-Type": "application/json",
          },
        }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await adminClient.auth.getUser(token);

    if (userError || !userData.user) {
      return new Response(
        JSON.stringify({ error: "Invalid authorization token" }),
        {
          status: 401,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Content-Type": "application/json",
          },
        }
      );
    }

    const adminUserId = userData.user.id;

    // Verify admin privileges
    const { data: adminProfile, error: profileError } = await adminClient
      .from("profiles")
      .select("is_admin")
      .eq("id", adminUserId)
      .single();

    if (profileError || !adminProfile?.is_admin) {
      return new Response(
        JSON.stringify({ error: "Insufficient privileges" }),
        {
          status: 403,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Parse request body
    let body;
    try {
      body = await req.json();
    } catch (jsonError) {
      return new Response(
        JSON.stringify({ error: "Invalid JSON in request body" }),
        {
          status: 400,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Content-Type": "application/json",
          },
        }
      );
    }

    const { request_id, user_id, status } = body;

    // Validate request parameters
    if (!request_id || !user_id || !status) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters: request_id, user_id, status" }),
        {
          status: 400,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (status !== "approved" && status !== "rejected") {
      return new Response(
        JSON.stringify({ error: "Invalid status. Must be 'approved' or 'rejected'" }),
        {
          status: 400,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Update verification request
    const { error: updateError } = await adminClient
      .from("verification_requests")
      .update({
        status: status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", request_id)
      .eq("user_id", user_id);

    if (updateError) {
      console.error("Error updating verification request:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update verification request" }),
        {
          status: 500,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Update user profile verification status
    const { error: profileUpdateError } = await adminClient
      .from("profiles")
      .update({ 
        is_verified: status === "approved",
        updated_at: new Date().toISOString()
      })
      .eq("id", user_id);

    if (profileUpdateError) {
      console.error("Error updating profile:", profileUpdateError);
      return new Response(
        JSON.stringify({ error: "Failed to update user profile" }),
        {
          status: 500,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Return success response
    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Verification request ${status} successfully`
      }),
      {
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        },
      }
    );

  } catch (error) {
    console.error("Unexpected error in admin-verification function:", error);
    return new Response(
      JSON.stringify({ 
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error occurred"
      }),
      {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        },
      }
    );
  }
});