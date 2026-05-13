const RESEND_API_URL = "https://api.resend.com/emails";

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(body),
  };
}

function clean(value) {
  return String(value ?? "").trim();
}

function htmlEscape(value) {
  return clean(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

async function supabaseInsert(table, payload) {
  const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(`Erreur Supabase ${table}: ${data?.message || data?.error || response.status}`);
  }

  return Array.isArray(data) ? data[0] : data;
}

async function supabasePatchEmailLog(id, payload) {
  if (!id) return;

  await fetch(`${process.env.SUPABASE_URL}/rest/v1/email_logs?id=eq.${id}`, {
    method: "PATCH",
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

function buildConfirmationButton(link) {
  return `
    <table role="presentation" align="center" cellspacing="0" cellpadding="0" border="0" style="margin:30px auto;">
      <tr>

        <td align="center" style="padding:0 8px;">
          <a href="${htmlEscape(link)}"
             style="
               display:inline-block;
               background:#d4af37;
               color:#111;
               padding:14px 24px;
               border-radius:10px;
               text-decoration:none;
               font-weight:bold;
               font-family:Arial,sans-serif;
             ">
             Confirmer mes tailles
          </a>
        </td>

        <td align="center" style="padding:0 8px;">
          <a href="https://boutique-karatesunfuki.com/pages/formulaire-de-commande"
             style="
               display:inline-block;
               background:#111;
               color:#fff;
               padding:14px 24px;
               border-radius:10px;
               text-decoration:none;
               font-weight:bold;
               border:2px solid #d4af37;
               font-family:Arial,sans-serif;
             ">
             ➕ Ajouter des items
          </a>
        </td>

      </tr>
    </table>
  `;
}

function injectConfirmationLink(html, confirmationLink) {
  if (!confirmationLink) return html;

  if (html.includes("{{confirmation_link}}")) {
    return html.replaceAll("{{confirmation_link}}", buildConfirmationButton(confirmationLink));
  }

  return `${html}${buildConfirmationButton(confirmationLink)}`;
}

function injectConfirmationLinkText(text, confirmationLink) {
  if (!confirmationLink) return text;

  if (text.includes("{{confirmation_link}}")) {
    return text.replaceAll("{{confirmation_link}}", confirmationLink);
  }

  return `${text}\n\nConfirmer mes tailles : ${confirmationLink}`;
}

function extractItems(email) {
  const source = Array.isArray(email.items)
    ? email.items
    : Array.isArray(email.products)
      ? email.products
      : [];

  return source
    .map((item) => ({
      product_name: clean(item.product_name || item.productName || item.produit || item.name),
      quantity: clean(item.quantity || item.qte || item.qty || "1"),
      current_size: clean(item.current_size || item.size || item.taille || ""),
      needs_size: item.needs_size !== false,
    }))
    .filter((item) => item.product_name);
}

async function sendResendEmail({ apiKey, from, replyTo, to, subject, html, text }) {
  const response = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      reply_to: replyTo || undefined,
      subject,
      html,
      text: text || undefined,
      tags: [{ name: "tool", value: "sunfuki-email-tool" }],
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.message || data?.error || "Erreur Resend inconnue");
  }

  return data;
}

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Méthode non autorisée" });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const siteUrl = clean(process.env.SITE_URL || "https://sunfuki-email-tool.netlify.app");

  if (!apiKey) return json(500, { error: "RESEND_API_KEY manquante." });
  if (!supabaseUrl) return json(500, { error: "SUPABASE_URL manquante." });
  if (!supabaseKey) return json(500, { error: "SUPABASE_SERVICE_ROLE_KEY manquante." });

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "JSON invalide." });
  }

  const from = clean(payload.from);
  const replyTo = clean(payload.replyTo || payload.reply_to);
  const emails = Array.isArray(payload.emails) ? payload.emails : [];

  if (!from) return json(400, { error: "FROM manquant." });
  if (!emails.length) return json(400, { error: "Aucun courriel à envoyer." });

  const results = [];

  for (const email of emails) {
    const to = clean(email.to);
    const subject = clean(email.subject);
    const text = String(email.text || "");
    const html = String(email.html || "");
    const items = extractItems(email);
    let emailLog = null;

    try {
      if (!to || !subject || !html) {
        throw new Error("Courriel invalide : to, subject ou html manquant.");
      }

      emailLog = await supabaseInsert("email_logs", {
        resend_id: null,
        recipient_email: to,
        original_email: clean(email.originalEmail || to),
        order_number: clean(email.orderNumber || email.order_number),
        prenom: clean(email.prenom),
        competitor: clean(email.competitor),
        dojo: clean(email.dojo),
        equipe: clean(email.equipe),
        subject,
        body: text,
        template_name: clean(email.templateName),
        status: "pending",
        error: null,
        mode: clean(email.mode),
      });

      const emailLogId = emailLog?.id;
      const confirmationLink = emailLogId
        ? `${siteUrl}/reponse?id=${encodeURIComponent(emailLogId)}`
        : "";

      if (emailLogId && items.length) {
        await supabaseInsert(
          "email_log_items",
          items.map((item) => ({
            email_log_id: emailLogId,
            product_name: item.product_name,
            quantity: item.quantity,
            current_size: item.current_size,
            needs_size: item.needs_size,
          }))
        );
      }

      const htmlWithLink = injectConfirmationLink(html, confirmationLink);
      const textWithLink = injectConfirmationLinkText(text, confirmationLink);

      const resendData = await sendResendEmail({
        apiKey,
        from,
        replyTo,
        to,
        subject,
        html: htmlWithLink,
        text: textWithLink,
      });

      await supabasePatchEmailLog(emailLogId, {
        resend_id: resendData?.id || null,
        status: "sent",
        error: null,
      });

      results.push({
        to,
        success: true,
        id: resendData?.id || null,
        email_log_id: emailLogId,
        confirmation_link: confirmationLink,
      });
    } catch (error) {
      const errorMessage = error.message || "Erreur inconnue";

      if (emailLog?.id) {
        await supabasePatchEmailLog(emailLog.id, {
          status: "error",
          error: errorMessage,
        }).catch(() => null);
      } else {
        await supabaseInsert("email_logs", {
          recipient_email: to,
          original_email: clean(email.originalEmail || to),
          order_number: clean(email.orderNumber || email.order_number),
          prenom: clean(email.prenom),
          competitor: clean(email.competitor),
          dojo: clean(email.dojo),
          equipe: clean(email.equipe),
          subject,
          body: text,
          template_name: clean(email.templateName),
          status: "error",
          error: errorMessage,
          mode: clean(email.mode),
        }).catch(() => null);
      }

      results.push({
        to,
        success: false,
        error: errorMessage,
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
