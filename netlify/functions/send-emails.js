const RESEND_API_URL = "https://api.resend.com/emails";
const DEFAULT_REPLY_TO = "commandes@boutique-karatesunfuki.com";

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify(body),
  };
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

function sanitizeEmailPayload(email) {
  return {
    to: String(email.to || "").trim(),
    subject: String(email.subject || "").trim(),
    html: String(email.html || ""),
    text: String(email.text || ""),
  };
}

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Méthode non autorisée" });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return json(500, { error: "Variable d'environnement RESEND_API_KEY manquante dans Netlify." });
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "JSON invalide." });
  }

  const from = String(payload.from || process.env.RESEND_FROM_EMAIL || "").trim();
  const replyTo = String(payload.replyTo || process.env.RESEND_REPLY_TO || DEFAULT_REPLY_TO).trim();
  const emails = Array.isArray(payload.emails) ? payload.emails.map(sanitizeEmailPayload) : [];

  if (!from) {
    return json(400, { error: "Adresse expéditeur FROM manquante." });
  }

  if (!emails.length) {
    return json(400, { error: "Aucun courriel à envoyer." });
  }

  if (emails.length > 100) {
    return json(400, { error: "Trop de courriels dans une seule requête. Maximum : 100." });
  }

  const invalid = emails.find((email) => !isValidEmail(email.to) || !email.subject || !email.html);
  if (invalid) {
    return json(400, {
      error: "Un courriel est invalide. Vérifiez les champs to, subject et html.",
      email: invalid,
    });
  }

  const results = [];

  for (const email of emails) {
    try {
      const response = await fetch(RESEND_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [email.to],
          reply_to: replyTo,
          subject: email.subject,
          html: email.html,
          text: email.text || undefined,
          tags: [
            { name: "tool", value: "sunfuki-email-tool" },
          ],
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        results.push({
          to: email.to,
          success: false,
          status: response.status,
          error: data?.message || data?.error || "Erreur Resend inconnue",
        });
        continue;
      }

      results.push({
        to: email.to,
        success: true,
        id: data?.id || null,
      });
    } catch (error) {
      results.push({
        to: email.to,
        success: false,
        error: error.message,
      });
    }
  }

  const failed = results.filter((result) => !result.success);

  return json(failed.length ? 207 : 200, {
    sent: results.length - failed.length,
    failed: failed.length,
    results,
  });
}
