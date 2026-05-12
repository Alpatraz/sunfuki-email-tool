function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify(body),
  };
}

async function supabaseGet(path) {
  const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/${path}`, {
    method: "GET",
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
  });

  const data = await response.json().catch(() => []);

  if (!response.ok) {
    throw new Error(data?.message || data?.error || `Erreur Supabase ${response.status}`);
  }

  return data;
}

export async function handler(event) {
  if (event.httpMethod !== "GET") {
    return json(405, { error: "Méthode non autorisée" });
  }

  try {
    const logs = await supabaseGet(
      "email_logs?select=*&order=created_at.desc&limit=500"
    );

    const responses = await supabaseGet(
      "responses?select=*&order=created_at.desc&limit=3000"
    );

    const responsesByLogId = {};

    responses.forEach((response) => {
      if (!response.email_log_id) return;

      if (!responsesByLogId[response.email_log_id]) {
        responsesByLogId[response.email_log_id] = [];
      }

      responsesByLogId[response.email_log_id].push(response);
    });

    const enrichedLogs = logs.map((log) => {
      const logResponses = responsesByLogId[log.id] || [];

      return {
        ...log,
        responses: logResponses,
        has_response: logResponses.length > 0,
        response_count: logResponses.length,
      };
    });

    return json(200, {
      success: true,
      logs: enrichedLogs,
      total: enrichedLogs.length,
      answered: enrichedLogs.filter((log) => log.has_response).length,
      pending: enrichedLogs.filter((log) => !log.has_response).length,
    });
  } catch (error) {
    return json(500, {
      success: false,
      error: error.message,
    });
  }
}
