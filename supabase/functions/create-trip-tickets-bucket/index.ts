import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BUCKET_NAME = "trip-tickets";

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

    // 1) List buckets to check if BUCKET_NAME exists
    const { data: buckets, error: listError } = await adminClient.storage.listBuckets();

    if (listError) {
      console.error("Error listing buckets:", listError);
      return new Response(
        JSON.stringify({ error: "Failed to list buckets" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const exists = buckets?.some((b) => b.name === BUCKET_NAME);

    if (!exists) {
      // 2) Create the bucket if it does not exist
      const { error: createError } = await adminClient.storage.createBucket(BUCKET_NAME, {
        public: true,
      });

      if (createError) {
        console.error("Error creating bucket:", createError);
        return new Response(
          JSON.stringify({ error: "Failed to create trip-tickets bucket" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    return new Response(
      JSON.stringify({ success: true, bucket: BUCKET_NAME }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("create-trip-tickets-bucket unexpected error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});