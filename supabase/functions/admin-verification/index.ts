import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface AdminVerificationPayload {
  request_id: string;
  user_id: string;
  status: "approved" | "rejected";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Supabase environment not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1) Authenticate caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Missing Authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await adminClient.auth.getUser(
      token,
    );

    if (userError || !userData.user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const adminUserId = userData.user.id;

    // 2) Ensure caller is admin
    const { data: adminProfile, error: profileError } = await adminClient
      .from("profiles")
      .select("is_admin")
      .eq("id", adminUserId)
      .maybeSingle();

    if (profileError || !adminProfile?.is_admin) {
      return new Response(
        JSON.stringify({ error: "Forbidden: Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 3) Parse payload
    const body = (await req.json()) as AdminVerificationPayload;
    if (!body.request_id || !body.user_id || !body.status) {
      return new Response(
        JSON.stringify({ error: "Invalid payload" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { request_id, user_id, status } = body;

    if (status !== "approved" && status !== "rejected") {
      return new Response(
        JSON.stringify({ error: "Invalid status value" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 4) Update verification_requests row
    const { error: requestError } = await adminClient
      .from("verification_requests")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", request_id)
      .eq("user_id", user_id);

    if (requestError) {
      console.error("admin-verification: error updating verification_requests", requestError);
      return new Response(
        JSON.stringify({ error: "Failed to update verification request" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 5) Update profiles.is_verified accordingly
    const shouldBeVerified = status === "approved";

    const { error: profileUpdateError } = await adminClient
      .from("profiles")
      .update({ is_verified: shouldBeVerified })
      .eq("id", user_id);

    if (profileUpdateError) {
      console.error("admin-verification: error updating profiles.is_verified", profileUpdateError);
      return new Response(
        JSON.stringify({ error: "Failed to update profile verification flag" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("admin-verification: unexpected error", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});