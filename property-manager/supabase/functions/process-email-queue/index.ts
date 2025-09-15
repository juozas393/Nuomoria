// Deno Deploy (Supabase Edge Functions)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const resendApiKey = Deno.env.get("RESEND_API_KEY");

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false }
});

async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  if (!resendApiKey) {
    throw new Error("RESEND_API_KEY not configured");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Property Manager <noreply@yourdomain.com>",
      to: [to],
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Resend API error: ${error}`);
  }

  return response.json();
}

Deno.serve(async (req) => {
  try {
    // Auth check (optional but recommended)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Get pending emails using claim batch (concurrency safe)
    const { data: emails, error } = await supabase.rpc('rpc_claim_outbox_batch', { p_limit: 20 });
    
    if (error) {
      console.error("Error claiming emails:", error);
      return new Response(`Error: ${error.message}`, { status: 500 });
    }

    if (!emails || emails.length === 0) {
      return new Response("No emails to process", { status: 200 });
    }

    console.log(`Processing ${emails.length} emails`);

    // Process each email
    for (const email of emails) {
      try {
        console.log(`Sending email ${email.id} to ${email.to_email}`);
        
        await sendEmail({
          to: email.to_email,
          subject: email.subject,
          html: email.html,
        });

        // Mark as sent
        const { error: updateError } = await supabase
          .from("email_outbox")
          .update({ 
            status: "sent",
            sent_at: new Date().toISOString()
          })
          .eq("id", email.id);

        if (updateError) {
          console.error(`Error updating email ${email.id}:`, updateError);
        } else {
          console.log(`✅ Email ${email.id} sent successfully`);
        }

      } catch (e) {
        console.error(`❌ Error sending email ${email.id}:`, e);
        
        // Mark as failed if too many attempts
        const { error: updateError } = await supabase
          .from("email_outbox")
          .update({ 
            status: email.attempts >= 5 ? "failed" : "pending",
            last_error: String(e)
          })
          .eq("id", email.id);

        if (updateError) {
          console.error(`Error updating failed email ${email.id}:`, updateError);
        }
      }
    }

    return new Response(`Processed ${emails.length} emails`, { status: 200 });

  } catch (error) {
    console.error("Edge function error:", error);
    return new Response(`Error: ${error.message}`, { status: 500 });
  }
});
