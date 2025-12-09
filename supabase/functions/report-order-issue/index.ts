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

    // 1) التحقق من التوكن
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

    // 2) قراءة جسم الطلب
    const body = (await req.json()) as ReportPayload;
    if (!body.request_id || !body.description) {
      return new Response(
        JSON.stringify({ error: "Invalid payload" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 3) جلب اسم ورقم هاتف المبلِّغ من profiles
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

    // 4) بناء نص الرسالة
    const emailTo = "shanshel6@gmail.com"; // لا يُعرَض للمستخدم في الواجهة
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

--
هذه الرسالة أُرسلت من نظام بلاغات الطلبات في وصلها.
`.trim();

    console.log("Order issue report - will be emailed:", {
      to: emailTo,
      subject,
      textBody,
    });

    // 5) إرسال البريد عبر خدمة خارجية (مثال باستخدام Resend API)
    // ملاحظة: يجب أن تضيف secret باسم RESEND_API_KEY في Supabase (Edge Functions → Manage Secrets)
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
      console.warn("RESEND_API_KEY is not set; email will not be sent, but report is logged.");
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