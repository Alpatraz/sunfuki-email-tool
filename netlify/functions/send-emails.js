const RESEND_API_URL = "https://api.resend.com/emails";

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(body),
  };
}

async function saveEmailLog(log) {
  const url = `${process.env.SUPABASE_URL}/rest/v1/email_logs`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(log),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    console.error("SUPABASE ERROR:", response.status, data);
  }

  return data;
}

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Méthode non autorisée" });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return json(500, { error: "RESEND_API_KEY manquante." });

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return json(500, { error: "Variables Supabase manquantes." });
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "JSON invalide." });
  }

  const from = String(payload.from || "").trim();
  const replyTo = String(payload.replyTo || "").trim();
  const emails = Array.isArray(payload.emails) ? payload.emails : [];

  if (!from) return json(400, { error: "FROM manquant." });
  if (!emails.length) return json(400, { error: "Aucun courriel à envoyer." });

  const results = [];

  for (const email of emails) {
    const response = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [email.to],
        reply_to: replyTo || undefined,
        subject: email.subject,
        html: email.html,
        text: email.text || undefined,
        tags: [{ name: "tool", value: "sunfuki-email-tool" }],
      }),
    });

    const data = await response.json().catch(() => ({}));
    const success = response.ok;
    const resendId = data?.id || null;
    const error = success ? null : data?.message || data?.error || "Erreur Resend inconnue";

    await saveEmailLog({
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
      status: success ? "sent" : "error",
      error,
      mode: email.mode || "",
    });

    results.push({
      to: email.to,
      success,
      id: resendId,
      error,
    });
  }

  const failed = results.filter((r) => !r.success);

  return json(failed.length ? 207 : 200, {
    sent: results.length - failed.length,
    failed: failed.length,
    results,
  });
}
