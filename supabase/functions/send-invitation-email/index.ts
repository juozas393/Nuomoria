// Supabase Edge Function: Send Tenant Invitation Email via Resend
// Professional clean email template - no emojis, proper branding

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

    const formattedCode = inviteCode.length === 8
      ? `${inviteCode.slice(0, 4)} - ${inviteCode.slice(4)}`
      : inviteCode;

    const displayName = landlordName || 'Nuomotojas';

    // Professional HTML email - no emojis
    const htmlContent = `
<!DOCTYPE html>
<html lang="lt">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f1f5f9;">
  
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9; padding: 48px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); overflow: hidden;">
          
          <!-- Header accent -->
          <tr>
            <td style="background: linear-gradient(to right, #2F8481, #3b9d99); height: 4px;"></td>
          </tr>
          
          <!-- Logo -->
          <tr>
            <td style="padding: 36px 48px 28px; text-align: center;">
              <img src="https://hlcvskkxrnwxtktscpyy.supabase.co/storage/v1/object/public/assets/logocanvaTransparent.png" alt="Nuomoria" width="180" style="max-width: 180px; height: auto;" />
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 0 48px 44px;">
              
              <p style="margin: 0 0 20px; color: #374151; font-size: 15px; line-height: 1.7;">
                Sveiki,
              </p>
              
              <p style="margin: 0 0 28px; color: #374151; font-size: 15px; line-height: 1.7;">
                <strong>${displayName}</strong> kviečia Jus prisijungti prie <span style="color: #2F8481; font-weight: 600;">Nuomoria</span> ir valdyti savo nuomą šiuo adresu:
              </p>
              
              <!-- Address Card -->
              <div style="background-color: #f8fafc; border-left: 4px solid #2F8481; border-radius: 0 8px 8px 0; padding: 18px 22px; margin-bottom: 32px;">
                <p style="margin: 0; color: #1e293b; font-size: 16px; font-weight: 600;">
                  ${propertyLabel}
                </p>
              </div>
              
              <!-- Code Section -->
              <div style="text-align: center; margin-bottom: 32px;">
                <p style="margin: 0 0 14px; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 500;">
                  Jūsų kvietimo kodas
                </p>
                
                <table cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                  <tr>
                    <td style="background-color: #1e293b; border-radius: 10px; padding: 22px 36px;">
                      <p style="margin: 0; font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace; font-size: 30px; font-weight: 700; color: #ffffff; letter-spacing: 5px;">
                        ${formattedCode}
                      </p>
                    </td>
                  </tr>
                </table>
              </div>
              
              <!-- CTA Button -->
              <div style="text-align: center; margin-bottom: 36px;">
                <a href="https://nuomoria.lt/login" style="display: inline-block; background-color: #2F8481; color: #ffffff; text-decoration: none; padding: 14px 36px; border-radius: 8px; font-size: 15px; font-weight: 600;">
                  Prisijungti prie Nuomoria
                </a>
              </div>
              
              <!-- Divider -->
              <div style="height: 1px; background-color: #e5e7eb; margin-bottom: 24px;"></div>
              
              <!-- Instructions -->
              <p style="margin: 0 0 14px; color: #374151; font-size: 14px; font-weight: 600;">
                Kaip prisijungti:
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-bottom: 10px;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="24" valign="top">
                          <div style="width: 20px; height: 20px; background-color: #2F8481; border-radius: 50%; color: #fff; font-size: 11px; font-weight: 600; text-align: center; line-height: 20px;">1</div>
                        </td>
                        <td style="padding-left: 10px; color: #6b7280; font-size: 14px; line-height: 20px;">Eikite į <a href="https://nuomoria.lt" style="color: #2F8481; text-decoration: none; font-weight: 500;">nuomoria.lt</a></td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom: 10px;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="24" valign="top">
                          <div style="width: 20px; height: 20px; background-color: #2F8481; border-radius: 50%; color: #fff; font-size: 11px; font-weight: 600; text-align: center; line-height: 20px;">2</div>
                        </td>
                        <td style="padding-left: 10px; color: #6b7280; font-size: 14px; line-height: 20px;">Prisijunkite arba susikurkite paskyrą</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td>
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="24" valign="top">
                          <div style="width: 20px; height: 20px; background-color: #2F8481; border-radius: 50%; color: #fff; font-size: 11px; font-weight: 600; text-align: center; line-height: 20px;">3</div>
                        </td>
                        <td style="padding-left: 10px; color: #6b7280; font-size: 14px; line-height: 20px;">Įveskite aukščiau pateiktą kodą</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 48px; background-color: #f8fafc; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 6px; color: #9ca3af; font-size: 12px; text-align: center;">
                Kodas galioja 7 dienas
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
                © ${new Date().getFullYear()} Nuomoria · <a href="mailto:support@nuomoria.lt" style="color: #2F8481; text-decoration: none;">support@nuomoria.lt</a>
              </p>
            </td>
          </tr>
          
        </table>
        
        <p style="margin: 20px 0 0; color: #9ca3af; font-size: 11px; text-align: center;">
          Gavote šį laišką, nes kažkas pakvietė Jus į Nuomoria sistemą.
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
