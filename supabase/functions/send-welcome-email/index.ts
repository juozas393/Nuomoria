// Supabase Edge Function: Send Welcome Email via Resend
// Mobile-responsive, dark mode compatible email template

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-app-version, x-supabase-api-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
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
    const { to, name } = body;

    const appUrl = 'https://nuomoria.lt/dashboard';

    if (!to) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const displayName = name || 'Vartotojau';

    // Mobile-responsive, dark mode compatible HTML email
    const htmlContent = `
<!DOCTYPE html>
<html lang="lt">
<head>
  <meta charset="UTF-8">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; color: #333333; line-height: 1.6; background-color: #ffffff;">
  
  <div style="max-width: 600px; padding: 20px;">
    
    <p style="margin-top: 0;">Sveiki, ${displayName}!</p>
    
    <p>Sveikiname prisijungus prie Nuomoria! 🎉</p>
    
    <p>Jūsų paskyra sėkmingai sukurta. Štai keletas naudingų nuorodų pradžiai:<br>
    • Prisijungimas: <a href="https://nuomoria.lt" style="color: #0056b3; text-decoration: underline;">https://nuomoria.lt</a><br>
    •  Pagalba: <a href="mailto:support@nuomoria.lt" style="color: #0056b3; text-decoration: underline;">support@nuomoria.lt</a></p>
    
    <p>Jei reikia pagalbos — rašykite bet kuriuo metu.</p>
    
    <p style="margin-bottom: 5px;">Pagarbiai,<br>Nuomoria komanda</p>
    
    <p style="color: #9ca3af; margin-top: 0; margin-bottom: 20px; font-family: monospace;">=============================================</p>
    
    <!-- Signature Block -->
    <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 12px;">
      <tr>
        <td style="padding-right: 15px; border-right: 3px solid #2F8481; vertical-align: middle;">
          <img src="https://nuomoria.lt/SmallLogoWithoutBG.png" alt="Nuomoria Logo" style="height: 50px; display: block;" />
        </td>
        <td style="padding-left: 15px; vertical-align: middle;">
          <div style="font-size: 18px; font-weight: bold; color: #111827; line-height: 1.2;">Nuomoria</div>
          <div style="font-size: 10px; font-weight: bold; color: #2F8481; letter-spacing: 1px; margin-bottom: 5px;">NUOMOS VALDYMO PLATFORMA</div>
          <div style="font-size: 13px; color: #6b7280;">
            <a href="mailto:support@nuomoria.lt" style="color: #6b7280; text-decoration: none;">support@nuomoria.lt</a> &nbsp;|&nbsp; 
            <a href="https://nuomoria.lt" style="color: #2F8481; text-decoration: none; font-weight: 600;">nuomoria.lt</a>
          </div>
        </td>
      </tr>
    </table>
    
    <!-- Gradient Line -->
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 400px; margin-bottom: 8px;">
      <tr>
        <td width="30%" style="background-color: #2F8481; height: 2px;"></td>
        <td width="30%" style="background-color: #55b0ad; height: 2px;"></td>
        <td width="40%" style="background-color: #cae8e7; height: 2px;"></td>
      </tr>
    </table>
    
    <p style="font-size: 10px; color: #9ca3af; margin: 0;">Profesionalus nuomos valdymas • paprastai ir efektyviai</p>
    
  </div>
  
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
        subject: `Sveiki atvykę į Nuomoria!`,
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
