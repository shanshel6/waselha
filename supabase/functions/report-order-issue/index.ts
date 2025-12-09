import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ReportPayload {
  request_id: string;
  description: string;
  problem_photo_url?: string | null;
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
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1) Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Missing Authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await adminClient.auth.getUser(token);

    if (userError || !userData.user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const reporterId = userData.user.id;
    const reporterEmail = userData.user.email ?? "";

    // 2) Payload
    const body = (await req.json()) as ReportPayload;
    if (!body.request_id || !body.description) {
      return new Response(
        JSON.stringify({ error: "Invalid payload" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 3) Max 3 reports per (request_id, reporter_id)
    const { count: existingCount, error: countError } = await adminClient
      .from("reports")
      .select("id", { count: "exact", head: true })
      .eq("request_id", body.request_id)
      .eq("reporter_id", reporterId);

    if (countError) {
      console.error("Error counting existing reports:", countError);
      return new Response(
        JSON.stringify({ error: "Failed to check existing reports" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if ((existingCount ?? 0) >= 3) {
      return new Response(
        JSON.stringify({ error: "Max reports reached for this order" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 4) Profile for name & phone
    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("first_name, last_name, phone")
      .eq("id", reporterId)
      .maybeSingle();

    if (profileError) {
      console.error("Failed to load reporter profile:", profileError);
    }

    const fullName = `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim() || "بدون اسم";
    const phone = profile?.phone ?? "غير مذكور";

    // 5) Insert into reports table (with optional photo URL)
    const { error: insertError } = await adminClient
      .from("reports")
      .insert({
        request_id: body.request_id,
        reporter_id: reporterId,
        reporter_name: fullName,
        reporter_phone: phone,
        reporter_email: reporterEmail,
        description: body.description,
        problem_photo_url: body.problem_photo_url ?? null,
      });

    if (insertError) {
      console.error("Failed to insert report:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to store report" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 6) Optional email to owner (unchanged logic)
    const emailTo = "shanshel6@gmail.com";
    const subject = `Waslaha - بلاغ عن طلب رقم ${body.request_id}`;
    const textBody = `
تم استلام بلاغ جديد عن طلب.

تفاصيل البلاغ:
- رقم الطلب (request_id): ${body.request_id}
- معرف المبلِّغ (user_id): ${reporterId}
- بريد المبلِّغ: ${reporterEmail || "غير مذكور"}

بيانات المبلِّغ من الملف الشخصي:
- الاسم: ${fullName}
- رقم الهاتف: ${phone}

نص المشكلة:
${body.description}

رابط صورة المشكلة (إن وُجد):
${body.problem_photo_url ?? "لا توجد صورة مرفقة"}

--
تم أيضاً حفظ هذا البلاغ في جدول التقارير بلوحة الإدارة.
`.trim();

    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (resendApiKey) {
      try {
        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "no-reply@waslaha.app",
            to: [emailTo],
            subject,
            text: textBody,
          }),
        });

        if (!emailRes.ok) {
          const errText = await emailRes.text();
          console.error("Resend email error:", emailRes.status, errText);
        }
      } catch (emailErr) {
        console.error("Error calling Resend API:", emailErr);
      }
    } else {
      console.warn("RESEND_API_KEY is not set; email will not be sent, but report is stored.");
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("report-order-issue unexpected error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});