// Supabase Edge Function: Send Tenant Invitation Email via Resend
// Mobile-responsive, dark mode compatible email template

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: "RESEND_API_KEY is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { to, inviteCode, propertyLabel, landlordName } = body;

    if (!to || !inviteCode || !propertyLabel) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format code - smaller for mobile
    const formattedCode = inviteCode.length === 8
      ? `${inviteCode.slice(0, 4)}-${inviteCode.slice(4)}`
      : inviteCode;

    const displayName = landlordName || 'Nuomotojas';

    // Mobile-responsive, dark mode compatible HTML email
    const htmlContent = `
<!DOCTYPE html>
<html lang="lt">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <style>
    :root {
      color-scheme: light dark;
    }
    @media (prefers-color-scheme: dark) {
      .email-body { background-color: #1a1a1a !important; }
      .email-container { background-color: #2d2d2d !important; border-color: #444 !important; }
      .text-primary { color: #f0f0f0 !important; }
      .text-secondary { color: #b0b0b0 !important; }
      .text-muted { color: #888 !important; }
      .bg-light { background-color: #3d3d3d !important; }
      .footer-bg { background-color: #252525 !important; }
      .divider { background-color: #444 !important; }
      .logo-light { display: none !important; }
      .logo-dark { display: block !important; }
    }
    @media (prefers-color-scheme: light) {
      .logo-light { display: block !important; }
      .logo-dark { display: none !important; }
    }
  </style>
</head>
<body class="email-body" style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f1f5f9;">
  
  <table width="100%" cellpadding="0" cellspacing="0" class="email-body" style="background-color: #f1f5f9; padding: 24px 12px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" class="email-container" style="max-width: 520px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08); overflow: hidden;">
          
          <!-- Header accent -->
          <tr>
            <td style="background: linear-gradient(to right, #2F8481, #3b9d99); height: 4px;"></td>
          </tr>
          
          <!-- Logo -->
          <tr>
            <td style="padding: 28px 24px 20px; text-align: center;">
              <img src="https://hlcvskkxrnwxtktscpyy.supabase.co/storage/v1/object/public/assets/logocanv.png" alt="Nuomoria" style="max-width: 160px; width: 100%; height: auto; display: block; margin: 0 auto;" />
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 0 24px 32px;">
              
              <p class="text-primary" style="margin: 0 0 16px; color: #374151; font-size: 15px; line-height: 1.6;">
                Sveiki,
              </p>
              
              <p class="text-primary" style="margin: 0 0 24px; color: #374151; font-size: 15px; line-height: 1.6;">
                <strong>${displayName}</strong> kviečia Jus prisijungti prie <span style="color: #2F8481; font-weight: 600;">Nuomoria</span> ir valdyti savo nuomą.
              </p>
              
              <!-- Address Card -->
              <div class="bg-light" style="background-color: #f8fafc; border-left: 3px solid #2F8481; border-radius: 0 8px 8px 0; padding: 14px 16px; margin-bottom: 24px;">
                <p class="text-primary" style="margin: 0; color: #1e293b; font-size: 15px; font-weight: 600; word-break: break-word;">
                  ${propertyLabel}
                </p>
              </div>
              
              <!-- Code Section -->
              <div style="text-align: center; margin-bottom: 24px;">
                <p class="text-secondary" style="margin: 0 0 12px; color: #6b7280; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">
                  Jūsų kvietimo kodas
                </p>
                
                <div style="background-color: #1e293b; border-radius: 10px; padding: 18px 20px; display: inline-block; cursor: pointer;">
                  <p style="margin: 0; font-family: 'SF Mono', 'Fira Code', Consolas, monospace; font-size: 24px; font-weight: 700; color: #ffffff; letter-spacing: 3px; -webkit-user-select: all; user-select: all;">
                    ${formattedCode}
                  </p>
                </div>
                
                <p class="text-muted" style="margin: 8px 0 0; color: #9ca3af; font-size: 10px;">
                  Paspauskite kodą, kad pažymėtumėte
                </p>
              </div>
              
              <!-- CTA Button -->
              <div style="text-align: center; margin-bottom: 28px;">
                <a href="https://nuomoria.lt/login" style="display: inline-block; background-color: #2F8481; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-size: 14px; font-weight: 600;">
                  Prisijungti prie Nuomoria
                </a>
              </div>
              
              <!-- Divider -->
              <div class="divider" style="height: 1px; background-color: #e5e7eb; margin-bottom: 20px;"></div>
              
              <!-- Instructions - simplified for mobile -->
              <p class="text-primary" style="margin: 0 0 12px; color: #374151; font-size: 13px; font-weight: 600;">
                Kaip prisijungti:
              </p>
              <div style="padding-left: 0;">
                <p class="text-secondary" style="margin: 0 0 8px; color: #6b7280; font-size: 13px; line-height: 1.5;">
                  <span style="color: #2F8481; font-weight: 600;">1.</span> Eikite į nuomoria.lt
                </p>
                <p class="text-secondary" style="margin: 0 0 8px; color: #6b7280; font-size: 13px; line-height: 1.5;">
                  <span style="color: #2F8481; font-weight: 600;">2.</span> Prisijunkite arba susikurkite paskyrą
                </p>
                <p class="text-secondary" style="margin: 0; color: #6b7280; font-size: 13px; line-height: 1.5;">
                  <span style="color: #2F8481; font-weight: 600;">3.</span> Įveskite kodą ir pradėkite!
                </p>
              </div>
              
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td class="footer-bg" style="padding: 20px 24px; background-color: #f8fafc; border-top: 1px solid #e5e7eb;">
              <p class="text-muted" style="margin: 0 0 4px; color: #9ca3af; font-size: 11px; text-align: center;">
                Kodas galioja 7 dienas
              </p>
              <p class="text-muted" style="margin: 0; color: #9ca3af; font-size: 11px; text-align: center;">
                © ${new Date().getFullYear()} Nuomoria · <a href="mailto:support@nuomoria.lt" style="color: #2F8481; text-decoration: none;">support@nuomoria.lt</a>
              </p>
            </td>
          </tr>
          
        </table>
        
        <p class="text-muted" style="margin: 16px 0 0; color: #9ca3af; font-size: 10px; text-align: center; padding: 0 12px;">
          Gavote šį laišką, nes kažkas pakvietė Jus į Nuomoria.
        </p>
        
      </td>
    </tr>
  </table>
  
</body>
</html>
    `;

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Nuomoria <noreply@nuomoria.lt>",
        to: [to],
        subject: `Kvietimas prisijungti: ${propertyLabel}`,
        html: htmlContent,
      }),
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      return new Response(
        JSON.stringify({ error: "Resend API error", resendError: resendData }),
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
