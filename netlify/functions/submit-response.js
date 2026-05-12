import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify(body),
  };
}

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return json(405, {
      error: "Méthode non autorisée",
    });
  }

  try {
    const body = JSON.parse(event.body || "{}");

    const {
      email_log_id,
      recipient_email,
      competitor,
      responses,
      comments,
    } = body;

    if (!email_log_id) {
      return json(400, {
        error: "email_log_id manquant",
      });
    }

    if (!Array.isArray(responses) || !responses.length) {
      return json(400, {
        error: "Aucune réponse fournie",
      });
    }

    const inserts = responses.map((item) => ({
      email_log_id,
      recipient_email,
      competitor,
      product_name: item.product_name || "",
      confirmed_size: item.confirmed_size || "",
      comments: comments || "",
    }));

    const { error } = await supabase
      .from("responses")
      .insert(inserts);

    if (error) {
      return json(500, {
        error: error.message,
      });
    }

    return json(200, {
      success: true,
      saved: inserts.length,
    });
  } catch (error) {
    return json(500, {
      error: error.message,
    });
  }
}
