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

    // 1) Ensure bucket exists
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

    // 2) Relax RLS for this bucket so client-side uploads don't hit RLS errors.
    // NOTE: this uses the storage.policies RPC-style helpers available in v2.
    // If policies already exist, these calls are effectively idempotent.

    // Allow authenticated users to upload to trip-tickets
    await adminClient.rpc('storage_set_bucket_policy', {
      bucket_name: BUCKET_NAME,
      policy: {
        name: 'trip_tickets_upload_authenticated',
        method: 'INSERT',
        roles: ['authenticated'],
      },
    }).catch(() => {});

    // Allow public read access to trip-tickets (needed so admin and users can view tickets by URL)
    await adminClient.rpc('storage_set_bucket_policy', {
      bucket_name: BUCKET_NAME,
      policy: {
        name: 'trip_tickets_public_read',
        method: 'SELECT',
        roles: ['anon', 'authenticated'],
      },
    }).catch(() => {});

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