// Supabase Edge Function: Send Tenant Invitation Email via Resend
// Simplified version for debugging

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    // Debug: Check if API key exists
    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: "RESEND_API_KEY is not configured", debug: "API key missing" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { to, inviteCode, propertyLabel } = body;

    if (!to || !inviteCode || !propertyLabel) {
      return new Response(
        JSON.stringify({ error: "Missing required fields", received: { to, inviteCode, propertyLabel } }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Simple HTML email
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #2F8481;">🏠 Kvietimas į būstą</h1>
        <p>Jūs esate pakviesti prisijungti prie būsto: <strong>${propertyLabel}</strong></p>
        <div style="background: #2F8481; color: white; padding: 20px; border-radius: 10px; text-align: center; margin: 20px 0;">
          <p style="margin: 0; font-size: 14px;">Jūsų kvietimo kodas:</p>
          <p style="margin: 10px 0; font-size: 32px; font-weight: bold; letter-spacing: 5px;">${inviteCode}</p>
        </div>
        <p style="color: #666; font-size: 12px;">Kodas galioja 7 dienas.</p>
      </div>
    `;

    // Send email via Resend API
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Nuomoria <onboarding@resend.dev>",
        to: [to],
        subject: `Kvietimas prisijungti prie būsto: ${propertyLabel}`,
        html: htmlContent,
      }),
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      return new Response(
        JSON.stringify({
          error: "Resend API error",
          resendStatus: resendResponse.status,
          resendError: resendData
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, messageId: resendData.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: "Internal error", details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
