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
  try {
    const id = event.queryStringParameters?.id;

    if (!id) {
      return json(400, {
        error: "ID manquant.",
      });
    }

    const { data: emailLog, error: emailError } = await supabase
      .from("email_logs")
      .select("*")
      .eq("id", id)
      .single();

    if (emailError || !emailLog) {
      return json(404, {
        error: "Courriel introuvable.",
      });
    }

    const { data: items, error: itemsError } = await supabase
      .from("email_log_items")
      .select("*")
      .eq("email_log_id", id)
      .order("created_at", { ascending: true });

    if (itemsError) {
      return json(500, {
        error: itemsError.message,
      });
    }

    return json(200, {
      success: true,
      emailLog,
      items: items || [],
    });
  } catch (error) {
    return json(500, {
      error: error.message,
    });
  }
}
