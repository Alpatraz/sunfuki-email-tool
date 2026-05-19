import React, { useEffect, useState } from "react";

export default function ResponsePage() {
  const [loading, setLoading] = useState(true);
  const [emailLog, setEmailLog] = useState(null);
  const [items, setItems] = useState([]);
  const [comments, setComments] = useState("");
  const [message, setMessage] = useState("");

  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");

  useEffect(() => {
    loadForm();
  }, []);

  async function loadForm() {
    try {
      const response = await fetch(`/.netlify/functions/get-response-form?id=${id}`);
      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || "Impossible de charger le formulaire.");
        return;
      }

      setEmailLog(result.emailLog);

      setItems(
        (result.items || []).map((item) => ({
          ...item,
          confirmed_size: item.current_size || "",
        }))
      );
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  function updateSize(index, value) {
    setItems((previous) =>
      previous.map((item, i) =>
        i === index
          ? { ...item, confirmed_size: value }
          : item
      )
    );
  }

  async function submitForm() {
    const missing = items.some(
      (item) => !String(item.confirmed_size || "").trim()
    );

    if (missing) {
      setMessage("Merci de remplir une taille pour chaque article.");
      return;
    }

    try {
      const response = await fetch(
        "/.netlify/functions/submit-response",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email_log_id: id,
            recipient_email: emailLog?.recipient_email,
            competitor: emailLog?.competitor,
            comments,
            responses: items.map((item) => ({
              product_name: item.product_name,
              confirmed_size: item.confirmed_size,
            })),
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        setMessage(
          result.error ||
          "Erreur lors de l'enregistrement."
        );
        return;
      }

      setMessage(
        "Merci, tes tailles ont bien été confirmées."
      );
    } catch (error) {
      setMessage(error.message);
    }
  }

  if (loading) {
    return (
      <PageShell>
        Chargement du formulaire...
      </PageShell>
    );
  }

  if (!id || !emailLog) {
    return (
      <PageShell>
        {message || "Formulaire introuvable."}
      </PageShell>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-6">

      <div className="max-w-3xl mx-auto bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-xl">

        <div className="mb-6">

          <div className="inline-flex rounded-full bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 px-3 py-1 text-sm mb-3">
            Karaté Sunfuki
          </div>

          <h1 className="text-3xl font-bold">
            Confirmation des tailles
          </h1>

          <p className="text-neutral-400 mt-2">
            Merci de confirmer les tailles pour les articles ci-dessous.
          </p>

          {/* BOUTON CHARTES */}

          <div className="mt-4">

            <a
              href="https://boutique-karatesunfuki.com/pages/chartes-des-grandeurs-des-produits"
              target="_blank"
              rel="noreferrer"
              className="
                flex
                items-center
                justify-center
                gap-2
                bg-neutral-950
                border
                border-yellow-600
                text-yellow-400
                font-semibold
                rounded-xl
                p-4
                hover:bg-yellow-500/10
                transition
              "
            >
              📏 Consulter les chartes des grandeurs Sunfuki
            </a>

            <p className="text-xs text-neutral-500 mt-2 text-center">
              Consultez les guides officiels avant de confirmer les tailles.
            </p>

          </div>

        </div>

        <div className="rounded-2xl bg-neutral-950 border border-neutral-800 p-4 mb-6 text-sm">

          <div>
            <strong>Compétiteur :</strong>{" "}
            {emailLog.competitor || "—"}
          </div>

          <div>
            <strong>Dojo :</strong>{" "}
            {emailLog.dojo || "—"}
          </div>

          <div>
            <strong>Équipe :</strong>{" "}
            {emailLog.equipe || "—"}
          </div>

          <div>
            <strong>Courriel :</strong>{" "}
            {emailLog.recipient_email || "—"}
          </div>

        </div>

        <div className="space-y-4">

          {items.map((item, index) => (

            <div
              key={item.id || index}
              className="
              rounded-2xl
              bg-neutral-950
              border
              border-neutral-800
              p-4
            "
            >

              <div className="font-semibold">
                {item.product_name}
              </div>

              <div className="text-sm text-neutral-400 mb-3">
                Quantité : {item.quantity || "1"}
              </div>

              <label className="block space-y-2">

                <span className="text-sm font-semibold">
                  Taille confirmée
                </span>

                <input
                  value={item.confirmed_size}
                  onChange={(event) =>
                    updateSize(
                      index,
                      event.target.value
                    )
                  }
                  placeholder="Ex. YL, M, 150, 10 ans..."
                  className="
                    w-full
                    bg-white
                    text-black
                    border
                    border-neutral-300
                    rounded-xl
                    p-3
                  "
                />

              </label>

            </div>

          ))}

        </div>

        <label className="block space-y-2 mt-6">

          <span className="text-sm font-semibold">
            Commentaire optionnel
          </span>

          <textarea
            value={comments}
            onChange={(event) =>
              setComments(event.target.value)
            }
            rows={4}
            className="
              w-full
              bg-white
              text-black
              border
              border-neutral-300
              rounded-xl
              p-3
            "
            placeholder="Ajouter une précision si nécessaire..."
          />

        </label>

        {message && (

          <div className="mt-5 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-200 p-4">
            {message}
          </div>

        )}

        <button
          onClick={submitForm}
          className="
            mt-6
            w-full
            bg-yellow-500
            hover:bg-yellow-400
            text-neutral-950
            font-bold
            rounded-2xl
            p-4
          "
        >
          Confirmer mes tailles
        </button>

      </div>

    </div>
  );
}

function PageShell({ children }) {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-6 flex items-center justify-center">

      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 max-w-xl text-center">

        {children}

      </div>

    </div>
  );
}
