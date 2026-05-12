const { Resend } = require("resend");
const { createClient } = require("@supabase/supabase-js");

const resend = new Resend(process.env.RESEND_API_KEY);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Méthode non autorisée" }),
    };
  }

  try {
    const body = JSON.parse(event.body || "{}");

    const emails = Array.isArray(body.emails) ? body.emails : [];

    if (!emails.length) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Aucun courriel fourni" }),
      };
    }

    const results = [];

    for (const email of emails) {
      try {
        const response = await resend.emails.send({
          from: body.from,
          to: email.to,
          subject: email.subject,
          html: email.html,
          text: email.text,
          reply_to: body.replyTo || undefined,
        });

        const resendId = response?.data?.id || null;

        await supabase.from("email_logs").insert({
          resend_id: resendId,

          recipient_email: email.to,
          original_email: email.originalEmail || email.to,

          prenom: email.prenom || "",
          competitor: email.competitor || "",

          dojo: email.dojo || "",
          equipe: email.equipe || "",

          subject: email.subject,
          body: email.text || "",

          template_name: email.templateName || "",

          status: "sent",

          mode: email.mode || "RÉEL",
        });

        results.push({
          success: true,
          id: resendId,
        });
      } catch (error) {
        console.error(error);

        await supabase.from("email_logs").insert({
          recipient_email: email.to,
          subject: email.subject,
          body: email.text || "",
          status: "error",
          error: error.message || "Erreur inconnue",
        });

        results.push({
          success: false,
          error: error.message,
        });
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        sent: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
        results,
      }),
    };
  } catch (error) {
    console.error(error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message,
      }),
    };
  }
};
