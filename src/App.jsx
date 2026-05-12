import React, { useMemo, useState } from "react";

const cutoffDate = new Date(2026, 4, 9);
const TEST_EMAIL_DEFAULT = "test@karatesunfuki.com";
const FROM_EMAIL_DEFAULT = "Karaté Sunfuki <noreply@mail.boutique-karatesunfuki.com>";

const defaultTemplates = [
  {
    id: "taille-probleme",
    name: "Confirmation de taille — problème technique",
    subject: "Action requise — Confirmation de taille pour ta commande d'équipement Karaté Sunfuki 2026/2027",
    body: `Bonjour {{prenom}},\n\nMerci d'avoir passé ta commande d'équipement pour la saison 2026/2027 avec {{Équipe}} — Dojo de {{Dojo}}.\n\nEn raison d'une erreur technique de notre côté, les tailles n'ont pas été enregistrées correctement dans notre système pour les commandes passées avant le 9 mai 2026.\n\nAfin de préparer ta commande, nous avons besoin que tu nous confirmes ta taille pour chaque article commandé :\n\n{{liste_produits}}\n\nMerci de répondre à ce courriel avant le {{date_limite}} en indiquant ta taille pour chacun des articles ci-dessus.\n\nL'équipe Karaté Sunfuki`,
  },
  {
    id: "combine-probleme-technique-et-charte",
    name: "Combiné — problème technique + nouvelle charte enfants",
    subject: "Action requise — Confirmation de tailles pour votre commande Karaté Sunfuki 2026/2027",
    body: `Bonjour {{prenom}},\n\nMerci d'avoir passé votre commande d'équipement Karaté Sunfuki pour la saison 2026/2027 avec {{Équipe}} — Dojo de {{Dojo}}.\n\nNous vous contactons concernant deux ajustements liés à votre commande :\n\n1. Certaines tailles d’articles n’ont pas été enregistrées correctement dans notre système.\n\n2. Une nouvelle charte des tailles a été mise en place pour les t-shirts et kangourous Cobra et International Cobra, avec l’ajout des tailles enfants.\n\nArticles à confirmer ou revérifier :\n\n{{liste_produits}}\n\n<a href="https://boutique-karatesunfuki.com/pages/chartes-des-grandeurs-des-produits" style="display:inline-block;background-color:#d4af37;color:#111;padding:12px 22px;border-radius:10px;text-decoration:none;font-weight:bold;margin-top:8px;">📏 Consulter la charte des tailles</a>\n\nMerci de répondre à ce courriel avant le {{date_limite}} en indiquant les tailles finales désirées.\n\nL’équipe Karaté Sunfuki`,
  },
  {
    id: "charte-tailles-enfants",
    name: "Mise à jour — tailles enfants t-shirts et kangourous",
    subject: "Mise à jour importante — Nouvelle charte de tailles pour les t-shirts et kangourous Sunfuki",
    body: `Bonjour {{prenom}},\n\nUne mise à jour a été apportée à la charte des tailles des t-shirts et kangourous Karaté Sunfuki.\n\nDes tailles enfants ont maintenant été ajoutées.\n\nMerci de revérifier la taille souhaitée pour les articles suivants :\n\n{{liste_produits}}\n\nMerci de répondre à ce courriel avant le {{date_limite}}.\n\nL’équipe Karaté Sunfuki`,
  },
];

const demoRows = [
  makeRow({
    id: "cmd-001",
    commande: "#1001",
    date: "06/05/2026 10:30",
    competiteur: "Alexandre Durand",
    email: "parent.alexandre@email.com",
    dojo: "Terrebonne",
    equipe: "Équipe Cobra",
    type: "Commande équipement compétition",
    products: [
      ["Kimono Kinko Saïko - Blanc - 150", "", "1"],
      ["Gants - Rouge - M", "", "1"],
    ],
  }),
  makeRow({
    id: "cmd-002",
    commande: "#1002",
    date: "08/05/2026 09:15",
    competiteur: "Anna Martin",
    email: "parent.anna@email.com",
    dojo: "Laval",
    equipe: "Équipe International Cobra",
    type: "Commande équipement compétition",
    products: [
      ["Kangourou - Équipe Cobra - Noir - YL", "", "1"],
      ["Grand sac - Noir", "", "1"],
    ],
  }),
  makeRow({
    id: "cmd-003",
    commande: "#1003",
    date: "10/05/2026 11:00",
    competiteur: "Noah Tremblay",
    email: "parent.noah@email.com",
    dojo: "Montréal",
    equipe: "Équipe Cobra",
    type: "Commande engagement",
    products: [["Engagement saison", "", "1"]],
  }),
];

function makeRow({ id, commande, date, competiteur, email, dojo, equipe, type, products }) {
  const [prenom = "", ...nomParts] = competiteur.split(" ");
  const raw = {
    Commande: commande,
    Date: date,
    Compétiteur: competiteur,
    "Email compétiteur": email,
    Dojo: dojo,
    Équipe: equipe,
    "Type de formulaire": type,
  };

  products.forEach(([produit, taille, qte], index) => {
    const n = index + 1;
    raw[`Produit ${n}`] = produit;
    raw[`Taille ${n}`] = taille;
    raw[`Qté ${n}`] = qte;
  });

  return {
    id,
    email,
    prenom,
    nom: nomParts.join(" "),
    competitor: competiteur,
    equipe,
    dojo,
    dateCommande: date,
    produits: products.map(([produit, taille, qte], index) => ({
      produit,
      produitBase: productBaseName(produit),
      taille,
      qte,
      index: index + 1,
    })),
    raw,
  };
}

function clean(value) {
  return String(value ?? "").trim();
}

function keyClean(value) {
  return clean(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function getField(raw, names) {
  const map = {};
  Object.entries(raw || {}).forEach(([key, value]) => {
    map[keyClean(key)] = value;
  });

  for (const name of names) {
    const value = map[keyClean(name)];
    if (value !== undefined) return value;
  }

  return "";
}

function productBaseName(value) {
  const raw = clean(value);
  if (!raw) return "";

  const colorWords = ["noir", "blanc", "rouge", "bleu", "vert", "jaune", "orange", "mauve", "rose", "gris", "or", "doré", "dore", "argent"];
  const sizePattern = /^(xxs|xs|s|m|l|xl|xxl|xxxl|2xl|3xl|4xl|5xl|yxs|ys|ym|yl|yxl|enfant|adulte|junior|[0-9]{2,3}|[0-9]{1,2}\s*ans)$/i;
  const parts = raw
    .replace(/\s*\|\s*/g, " - ")
    .replace(/\s*\/\s*/g, " - ")
    .split(/\s+-\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
  const kept = [];

  for (const part of parts) {
    const normalized = keyClean(part);
    const lower = part.toLowerCase();
    const isVariant =
      normalized.includes("taille") ||
      normalized.includes("size") ||
      normalized.includes("couleur") ||
      normalized.includes("color") ||
      sizePattern.test(lower) ||
      colorWords.some((color) => keyClean(color) === normalized);

    if (isVariant) break;
    kept.push(part);
  }

  return kept.length ? kept.join(" - ") : raw;
}

function splitCsvLine(line, separator) {
  const cells = [];
  let current = "";
  let quoted = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && next === '"') {
      current += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === separator && !quoted) {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  cells.push(current.trim());
  return cells;
}

function extractProducts(raw) {
  const products = [];

  for (let i = 1; i <= 30; i += 1) {
    const produit = clean(getField(raw, [`Produit ${i}`, `Product ${i}`, `Article ${i}`, `Item ${i}`]));
    const taille = clean(getField(raw, [`Taille ${i}`, `Size ${i}`]));
    const qte = clean(getField(raw, [`Qté ${i}`, `Qte ${i}`, `Quantité ${i}`, `Quantity ${i}`, `Qty ${i}`]));

    if (produit || taille || qte) {
      products.push({
        produit: produit || `Article ${i}`,
        produitBase: productBaseName(produit || `Article ${i}`),
        taille,
        qte: qte || "1",
        index: i,
      });
    }
  }

  return products;
}

function parseCsv(text) {
  const content = String(text || "").replace(/^\uFEFF/, "").trim();
  if (!content) return { rows: [], headers: [] };

  const lines = content.split(/\r?\n/).filter(Boolean);
  const separator = (lines[0].match(/;/g) || []).length > (lines[0].match(/,/g) || []).length ? ";" : ",";
  const headers = splitCsvLine(lines[0], separator).map((header) => header.replace(/^"|"$/g, ""));

  const rows = lines.slice(1).map((line, index) => {
    const cells = splitCsvLine(line, separator).map((cell) => cell.replace(/^"|"$/g, ""));
    const raw = {};

    headers.forEach((header, headerIndex) => {
      raw[header] = cells[headerIndex] || "";
    });

    const competitor = clean(getField(raw, ["Compétiteur", "Competiteur", "Nom complet", "Client"]));
    const [prenom = "", ...nomParts] = competitor.split(/\s+/).filter(Boolean);

    return {
      id: `csv-${Date.now()}-${index}`,
      email: clean(getField(raw, ["Email compétiteur", "Email competiteur", "email", "courriel", "adresse courriel"])),
      prenom: clean(getField(raw, ["prenom", "prénom", "first name"])) || prenom,
      nom: clean(getField(raw, ["nom", "last name"])) || nomParts.join(" "),
      competitor,
      equipe: clean(getField(raw, ["Équipe", "Equipe", "team"])),
      dojo: clean(getField(raw, ["Dojo", "succursale", "club", "école", "ecole"])),
      dateCommande: clean(getField(raw, ["Date", "date_commande", "date commande", "created at", "order date"])),
      produits: extractProducts(raw),
      raw,
    };
  });

  return { rows, headers };
}

function parseDate(value) {
  const raw = clean(value);
  const match = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);

  if (match) {
    const [, d, m, y, h = "0", min = "0"] = match;
    return new Date(Number(y), Number(m) - 1, Number(d), Number(h), Number(min));
  }

  const fallback = new Date(raw);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

function isBeforeCutoff(value) {
  const date = parseDate(value);
  return !date || date < cutoffDate;
}

function hasMissingSize(row) {
  return (row.produits || []).some((product) => {
    const name = clean(product.produit).toLowerCase();
    return name && !clean(product.taille) && !name.includes("engagement");
  });
}

function isEligibleOrder(row) {
  return isBeforeCutoff(row.dateCommande) && hasMissingSize(row);
}

function productList(produits) {
  const missing = (produits || []).filter((product) => {
    const name = clean(product.produit).toLowerCase();
    return name && !clean(product.taille) && !name.includes("engagement");
  });
  const list = missing.length ? missing : produits || [];

  return list
    .map((product) => `• ${product.produitBase || productBaseName(product.produit)}${product.qte ? ` — Qté ${product.qte}` : ""}`)
    .join("\n");
}

function renderTemplate(text, row, dateLimite) {
  const variables = {
    ...(row?.raw || {}),
    email: row?.email || "",
    prenom: row?.prenom || "",
    nom: row?.nom || "",
    competiteur: row?.competitor || "",
    equipe: row?.equipe || "",
    dojo: row?.dojo || "",
    date_commande: row?.dateCommande || "",
    liste_produits: productList(row?.produits || []),
    date_limite: dateLimite || "",
  };

  return String(text || "").replace(/{{\s*([^}]+?)\s*}}/g, (match, variableName) => {
    if (variables[variableName] !== undefined) return variables[variableName];
    const found = Object.entries(variables).find(([key]) => keyClean(key) === keyClean(variableName));
    return found ? found[1] : match;
  });
}

function htmlFromBody(body) {
  return String(body || "").replace(/\n/g, "<br />");
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean(email));
}

function runSelfTests() {
  console.assert(productBaseName("Gants - Rouge - M") === "Gants", "productBaseName should remove color and size");
  console.assert(productBaseName("Kangourou - Équipe Cobra - Noir - YL") === "Kangourou - Équipe Cobra", "productBaseName should keep product/team name");
  console.assert(htmlFromBody("A\nB") === "A<br />B", "htmlFromBody should convert newlines");
  console.assert(validateEmail("test@example.com") === true, "validateEmail should accept valid email");
  console.assert(validateEmail("not-an-email") === false, "validateEmail should reject invalid email");
  const parsed = parseCsv('Commande,Date,Compétiteur,Email compétiteur,Dojo,Équipe,Type de formulaire,Produit 1,Taille 1,Qté 1\n#1,06/05/2026 10:00,Marc Test,test@email.com,Laval,Équipe Cobra,Commande équipement compétition,Gants - Rouge - M,,1');
  console.assert(parsed.rows.length === 1, "parseCsv should parse one row");
  console.assert(parsed.rows[0].produits[0].produitBase === "Gants", "parseCsv should derive product base name");
}

if (typeof window !== "undefined") {
  runSelfTests();
}

export default function SunfukiEmailToolPreview() {
  const [rows, setRows] = useState(demoRows);
  const [headers, setHeaders] = useState(Object.keys(demoRows[0].raw));
  const [selectedIds, setSelectedIds] = useState(() => new Set(demoRows.filter(isEligibleOrder).map((row) => row.id)));
  const [templates, setTemplates] = useState(defaultTemplates);
  const [selectedTemplateId, setSelectedTemplateId] = useState(defaultTemplates[0].id);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [selectedRowId, setSelectedRowId] = useState(demoRows[0].id);
  const [dateLimite, setDateLimite] = useState("15 mai 2026");
  const [search, setSearch] = useState("");
  const [teamFilter, setTeamFilter] = useState("Toutes");
  const [formTypeFilter, setFormTypeFilter] = useState("Tous");
  const [productFilters, setProductFilters] = useState([]);
  const [testMode, setTestMode] = useState(true);
  const [sentLog, setSentLog] = useState([]);
  const [openLogId, setOpenLogId] = useState(null);
  const [message, setMessage] = useState("Données de démonstration chargées.");
  const [showVariables, setShowVariables] = useState(false);
  const [resendConnected, setResendConnected] = useState(false);
  const [testEmail, setTestEmail] = useState(TEST_EMAIL_DEFAULT);
  const [fromEmail, setFromEmail] = useState(FROM_EMAIL_DEFAULT);

  const selectedTemplate = templates.find((template) => template.id === selectedTemplateId) || templates[0];
  const selectedRow = rows.find((row) => row.id === selectedRowId) || rows[0];

  const teams = useMemo(() => ["Toutes", ...Array.from(new Set(rows.map((row) => row.equipe).filter(Boolean)))], [rows]);
  const formTypes = useMemo(() => {
    const values = rows
      .map((row) => clean(getField(row.raw, ["Type de formulaire", "Type formulaire", "Form Type", "Formulaire"])))
      .filter(Boolean);
    return ["Tous", ...Array.from(new Set(values))];
  }, [rows]);

  const baseFilteredRows = useMemo(() => {
    const query = search.toLowerCase().trim();

    return rows.filter((row) => {
      const formType = clean(getField(row.raw, ["Type de formulaire", "Type formulaire", "Form Type", "Formulaire"]));
      const rawText = Object.values(row.raw || {}).join(" ").toLowerCase();
      const matchesTeam = teamFilter === "Toutes" || row.equipe === teamFilter;
      const matchesForm = formTypeFilter === "Tous" || formType === formTypeFilter;
      const matchesSearch = !query || `${row.prenom} ${row.nom} ${row.email} ${row.dojo} ${rawText}`.toLowerCase().includes(query);
      return matchesTeam && matchesForm && matchesSearch;
    });
  }, [rows, search, teamFilter, formTypeFilter]);

  const availableProducts = useMemo(() => {
    const names = baseFilteredRows
      .flatMap((row) => (row.produits || []).map((product) => product.produitBase || productBaseName(product.produit)))
      .filter((name) => name && !name.toLowerCase().includes("engagement"));
    return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b, "fr"));
  }, [baseFilteredRows]);

  const activeProductFilters = productFilters.filter((product) => availableProducts.includes(product));
  const visibleRows = useMemo(() => {
    if (!activeProductFilters.length) return baseFilteredRows;

    return baseFilteredRows.filter((row) => {
      const rowProducts = (row.produits || []).map((product) => product.produitBase || productBaseName(product.produit));
      return activeProductFilters.some((filter) => rowProducts.includes(filter));
    });
  }, [baseFilteredRows, activeProductFilters]);

  const selectedRows = useMemo(() => rows.filter((row) => selectedIds.has(row.id)), [rows, selectedIds]);
  const previewSubject = renderTemplate(selectedTemplate.subject, selectedRow, dateLimite);
  const previewBody = renderTemplate(selectedTemplate.body, selectedRow, dateLimite);
  const variables = ["prenom", "nom", "competiteur", "email", "equipe", "dojo", "date_commande", "liste_produits", "date_limite", ...headers];

  function toggleRow(id) {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleProduct(product) {
    setProductFilters((previous) =>
      previous.includes(product) ? previous.filter((item) => item !== product) : [...previous, product]
    );
  }

  function saveTemplate() {
    if (!editingTemplate) return;

    const saved = {
      ...editingTemplate,
      name: clean(editingTemplate.name) || "Template sans nom",
      subject: clean(editingTemplate.subject) || "Sans objet",
      body: editingTemplate.body || "",
    };

    setTemplates((previous) => previous.map((template) => (template.id === saved.id ? saved : template)));
    setSelectedTemplateId(saved.id);
    setEditingTemplate(null);
  }

  function createTemplate() {
    const template = {
      id: `template-${Date.now()}`,
      name: "Nouveau template",
      subject: "Nouvel objet de courriel",
      body: `Bonjour {{prenom}},\n\nVotre message ici.\n\nL'équipe Karaté Sunfuki`,
    };

    setTemplates((previous) => [...previous, template]);
    setSelectedTemplateId(template.id);
    setEditingTemplate(template);
  }

  function duplicateTemplate() {
    const source = templates.find((template) => template.id === selectedTemplateId) || templates[0];
    const copy = { ...source, id: `template-${Date.now()}`, name: `${source.name} — copie` };
    setTemplates((previous) => [...previous, copy]);
    setSelectedTemplateId(copy.id);
    setEditingTemplate(copy);
  }

  function deleteTemplate(id) {
    if (templates.length <= 1) return;
    const remaining = templates.filter((template) => template.id !== id);
    setTemplates(remaining);
    setSelectedTemplateId(remaining[0].id);
    setEditingTemplate(null);
  }

  async function importCsv(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const parsed = parseCsv(await file.text());
      if (!parsed.rows.length) {
        setMessage("CSV vide ou illisible.");
        return;
      }

      const autoIds = parsed.rows.filter(isEligibleOrder).map((row) => row.id);
      setRows(parsed.rows);
      setHeaders(parsed.headers);
      setSelectedIds(new Set(autoIds));
      setSelectedRowId(autoIds[0] || parsed.rows[0].id);
      setProductFilters([]);
      setSentLog([]);
      setMessage(`${parsed.rows.length} ligne(s) importée(s), ${parsed.headers.length} colonne(s), ${autoIds.length} sélectionnée(s) automatiquement.`);
    } catch (error) {
      setMessage(`Erreur import CSV : ${error.message}`);
    } finally {
      event.target.value = "";
    }
  }

  function connectResend() {
    setResendConnected(true);
    setMessage("Connexion prête. L'envoi passera par la fonction Netlify /.netlify/functions/send-emails.");
  }

  async function sendEmails() {
    if (testMode && !validateEmail(testEmail)) {
      setMessage("Adresse courriel de test invalide.");
      return;
    }

    if (!resendConnected) {
      setMessage("Active d'abord l'envoi via Netlify avec le bouton de connexion.");
      return;
    }

    const now = new Date().toLocaleString("fr-CA");
    const emailsToSend = selectedRows.map((row) => ({
      rowId: row.id,
      prenom: row.prenom,
      to: testMode ? testEmail : row.email,
      originalEmail: row.email,
      subject: renderTemplate(selectedTemplate.subject, row, dateLimite),
      body: renderTemplate(selectedTemplate.body, row, dateLimite),
      templateName: selectedTemplate.name,
      mode: testMode ? "TEST" : "RÉEL",
      date: now,
    }));

    try {
      const response = await fetch("/.netlify/functions/send-emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromEmail,
          emails: emailsToSend.map((email) => ({
  to: email.to,
  subject: email.subject,
  html: htmlFromBody(email.body),
  text: email.body,

  originalEmail: email.originalEmail,
  prenom: email.prenom,
  competitor: email.prenom,
  dojo: selectedRow?.dojo || "",
  equipe: selectedRow?.equipe || "",
  templateName: email.templateName,
  mode: email.mode,
})),
        }),
      });

      const result = await response.json().catch(() => ({}));

      const logs = emailsToSend.map((email, index) => {
        const serverResult = result?.results?.[index];
        return {
          id: `log-${Date.now()}-${index}`,
          email: email.to,
          originalEmail: email.originalEmail,
          subject: email.subject,
          body: email.body,
          templateName: email.templateName,
          mode: email.mode,
          date: email.date,
          prenom: email.prenom,
          success: Boolean(serverResult?.success),
          error: serverResult?.error || null,
          resendId: serverResult?.id || null,
        };
      });

      setSentLog((previous) => [...logs, ...previous]);
      if (logs[0]) setOpenLogId(logs[0].id);

      if (!response.ok || result.failed > 0) {
        const firstError = result?.results?.find((item) => !item.success)?.error || result.error || `Erreur serveur ${response.status}`;
        setMessage(`Envoi partiel ou refusé : ${firstError}`);
        return;
      }

      setMessage(`${result.sent || logs.length} courriel(s) envoyé(s) via Resend.`);
    } catch (error) {
      setMessage(`Envoi non confirmé : ${error.message}. Vérifie les logs Netlify de la fonction send-emails.`);
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="inline-flex rounded-full bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 px-3 py-1 text-sm mb-3">Outil d'envoi — Karaté Sunfuki</div>
            <h1 className="text-3xl lg:text-4xl font-bold">Envoi ciblé de courriels depuis un CSV</h1>
            <p className="text-neutral-400 mt-2">Import CSV, filtres, sélection manuelle, templates et historique.</p>
          </div>
          <label className="bg-neutral-800 hover:bg-neutral-700 text-white rounded-2xl px-5 py-3 cursor-pointer font-medium">
            Importer CSV
            <input type="file" accept=".csv,text/csv" onChange={importCsv} className="hidden" />
          </label>
        </header>

        <InfoBox>{message}</InfoBox>

        <Panel title="Connexion Resend / Netlify">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-end">
            <Input label="Adresse expéditeur (FROM)" value={fromEmail} onChange={setFromEmail} />
            <button onClick={connectResend} className="btn-gold h-[52px]">Activer l'envoi via Netlify</button>
            <div className={`lg:col-span-2 rounded-2xl border px-4 py-3 text-sm font-semibold ${resendConnected ? "bg-green-500/10 border-green-500/30 text-green-300" : "bg-neutral-900 border-neutral-700 text-neutral-400"}`}>
              {resendConnected ? "Prêt à envoyer via la fonction Netlify" : "Fonction Netlify non activée dans l'interface"}
            </div>
          </div>
          <div className="mt-4 rounded-2xl bg-neutral-950 border border-neutral-800 p-4 text-sm text-neutral-300">
            <div className="font-semibold text-white mb-2">Important</div>
            <div>La clé API Resend ne doit pas être dans React. Elle doit être ajoutée dans Netlify comme variable d'environnement : RESEND_API_KEY.</div>
            <div>Le frontend appellera : /.netlify/functions/send-emails</div>
          </div>
        </Panel>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Metric title="Lignes" value={rows.length} icon="👥" />
          <Metric title="Colonnes" value={headers.length} icon="📊" />
          <Metric title="Détectées auto" value={rows.filter(isEligibleOrder).length} icon="⚠️" warning />
          <Metric title="Sélectionnées" value={selectedRows.length} icon="☑️" success />
        </div>

        <Panel title="Gestion des templates">
          <div className="flex flex-wrap gap-2 mb-4">
            <button onClick={createTemplate} className="btn-gold">Ajouter</button>
            <button onClick={() => setEditingTemplate({ ...selectedTemplate })} className="btn-dark">Modifier</button>
            <button onClick={duplicateTemplate} className="btn-dark">Dupliquer</button>
            <button onClick={() => deleteTemplate(selectedTemplateId)} disabled={templates.length <= 1} className="btn-red disabled:opacity-50">Supprimer</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {templates.map((template) => (
              <button key={template.id} onClick={() => setSelectedTemplateId(template.id)} className={`text-left rounded-2xl border p-4 ${selectedTemplateId === template.id ? "border-yellow-500 bg-yellow-500/10" : "border-neutral-800 bg-neutral-950 hover:bg-neutral-800"}`}>
                <div className="font-semibold">{template.name}</div>
                <div className="text-xs text-neutral-400 mt-1">{template.subject}</div>
              </button>
            ))}
          </div>

          {editingTemplate && (
            <div className="mt-5 rounded-3xl border border-yellow-500/30 bg-neutral-950 p-5 space-y-4">
              <Input label="Nom du template" value={editingTemplate.name} onChange={(value) => setEditingTemplate((template) => ({ ...template, name: value }))} />
              <Input label="Objet" value={editingTemplate.subject} onChange={(value) => setEditingTemplate((template) => ({ ...template, subject: value }))} />
              <textarea value={editingTemplate.body} onChange={(event) => setEditingTemplate((template) => ({ ...template, body: event.target.value }))} rows={10} className="input font-mono text-sm" />
              <div className="flex gap-2">
                <button onClick={saveTemplate} className="btn-gold">Enregistrer</button>
                <button onClick={() => setEditingTemplate(null)} className="btn-dark">Annuler</button>
              </div>
            </div>
          )}
        </Panel>

        <Panel title="Variables disponibles">
          <button onClick={() => setShowVariables((value) => !value)} className="btn-dark mb-3">{showVariables ? "Masquer" : "Afficher"}</button>
          {showVariables && (
            <div className="flex flex-wrap gap-2">
              {variables.map((variable, index) => (
                <span key={`${variable}-${index}`} className="rounded-full bg-neutral-950 border border-neutral-700 px-3 py-1 text-xs">{`{{${variable}}}`}</span>
              ))}
            </div>
          )}
        </Panel>

        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
          <Panel className="xl:col-span-3" title="Commandes importées">
            <div className="flex flex-col lg:flex-row gap-2 mb-4">
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher..." className="input" />
              <select value={teamFilter} onChange={(event) => setTeamFilter(event.target.value)} className="input lg:w-56">
                {teams.map((team) => <option key={team}>{team}</option>)}
              </select>
              <select value={formTypeFilter} onChange={(event) => setFormTypeFilter(event.target.value)} className="input lg:w-72">
                {formTypes.map((type) => <option key={type}>{type}</option>)}
              </select>
            </div>

            <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4 mb-4">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-3">
                <div>
                  <div className="font-semibold">Filtre par produits</div>
                  <div className="text-sm text-neutral-400">Produits principaux uniquement, sans tailles, couleurs ou variantes.</div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button onClick={() => setProductFilters([])} className="btn-dark text-sm">Réinitialiser</button>
                  <button onClick={() => setProductFilters(availableProducts.filter((product) => {
                    const name = product.toLowerCase();
                    return (name.includes("t-shirt") || name.includes("hoodie") || name.includes("kangourou")) && name.includes("cobra");
                  }))} className="btn-gold text-sm">Cobra / International Cobra</button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 max-h-48 overflow-auto pr-1">
                {availableProducts.map((product) => (
                  <button key={product} onClick={() => toggleProduct(product)} className={`rounded-full border px-3 py-2 text-xs ${productFilters.includes(product) ? "bg-yellow-500/20 border-yellow-500 text-yellow-300" : "bg-neutral-900 border-neutral-700 text-neutral-300 hover:bg-neutral-800"}`}>
                    {productFilters.includes(product) ? "☑ " : "☐ "}{product}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              <button onClick={() => setSelectedIds(new Set(rows.filter(isEligibleOrder).map((row) => row.id)))} className="btn-gold">Sélection automatique</button>
              <button onClick={() => setSelectedIds((previous) => {
                const next = new Set(previous);
                visibleRows.forEach((row) => next.add(row.id));
                return next;
              })} className="btn-dark">Sélectionner les lignes visibles</button>
              <button onClick={() => setSelectedIds(new Set())} className="btn-dark">Tout décocher</button>
            </div>

            <div className="overflow-auto rounded-2xl border border-neutral-800 max-h-[560px]">
              <table className="w-full text-sm min-w-[1050px]">
                <thead className="bg-neutral-950 text-neutral-300 sticky top-0">
                  <tr>
                    <th className="p-3 text-left">Envoyer</th>
                    <th className="p-3 text-left">Détection</th>
                    <th className="p-3 text-left">Commande</th>
                    <th className="p-3 text-left">Compétiteur</th>
                    <th className="p-3 text-left">Équipe / Dojo</th>
                    <th className="p-3 text-left">Date</th>
                    <th className="p-3 text-left">Produits sans taille</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((row) => {
                    const missing = (row.produits || []).filter((product) => clean(product.produit) && !clean(product.taille) && !clean(product.produit).toLowerCase().includes("engagement"));
                    return (
                      <tr key={row.id} onClick={() => setSelectedRowId(row.id)} className={`border-t border-neutral-800 cursor-pointer hover:bg-neutral-800 ${selectedRow?.id === row.id ? "bg-yellow-500/10" : ""}`}>
                        <td className="p-3" onClick={(event) => event.stopPropagation()}>
                          <input type="checkbox" checked={selectedIds.has(row.id)} onChange={() => toggleRow(row.id)} className="h-5 w-5 accent-yellow-500" />
                        </td>
                        <td className="p-3">{isEligibleOrder(row) ? <Badge color="yellow">Auto</Badge> : <Badge>Non</Badge>}</td>
                        <td className="p-3 font-medium">{row.raw?.Commande || "—"}<div className="text-xs text-neutral-500">{row.email || "Courriel manquant"}</div></td>
                        <td className="p-3">{row.competitor || `${row.prenom} ${row.nom}`}</td>
                        <td className="p-3">{row.equipe || "—"}<div className="text-xs text-neutral-500">{row.dojo || "Dojo non précisé"}</div></td>
                        <td className="p-3">{row.dateCommande || "—"}</td>
                        <td className="p-3 text-neutral-300">{missing.length ? missing.map((product) => product.produitBase || productBaseName(product.produit)).join(", ") : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel className="xl:col-span-2" title="Prévisualisation">
            <label className="block text-sm font-semibold mb-2">Template</label>
            <div className="flex gap-2 mb-4">
              <select value={selectedTemplateId} onChange={(event) => setSelectedTemplateId(event.target.value)} className="input">
                {templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
              </select>
              <button onClick={() => setEditingTemplate({ ...selectedTemplate })} className="btn-dark">Modifier</button>
            </div>
            <Input label="Date limite" value={dateLimite} onChange={setDateLimite} />
            <div className="rounded-2xl border border-neutral-800 bg-white text-black overflow-hidden mt-4">
              <div className="bg-neutral-100 border-b p-4">
                <div className="text-xs text-neutral-500">À : {selectedRow?.email || "—"}</div>
                <div className="font-bold mt-1">{previewSubject}</div>
              </div>
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed p-4 max-h-[300px] overflow-auto">{previewBody}</pre>
            </div>
            <div className="rounded-2xl border border-neutral-800 bg-neutral-950 overflow-hidden mt-4">
              <div className="p-3 border-b border-neutral-800 font-semibold">Données complètes</div>
              <div className="max-h-72 overflow-auto p-3 space-y-2">
                {headers.map((header) => (
                  <div key={header} className="grid grid-cols-3 gap-2 text-xs border-b border-neutral-800 pb-2">
                    <div className="text-neutral-400 break-words">{header}</div>
                    <div className="col-span-2 break-words">{selectedRow?.raw?.[header] || "—"}</div>
                  </div>
                ))}
              </div>
            </div>
          </Panel>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Panel title="Envoi">
            <div className="rounded-2xl bg-neutral-950 border border-neutral-800 p-4 mb-4 space-y-4">
              <label className="flex items-center justify-between gap-3 cursor-pointer">
                <span><span className="font-semibold">Mode test</span><span className="block text-sm text-neutral-400">Envoie tout vers l'adresse de test configurée</span></span>
                <input type="checkbox" checked={testMode} onChange={(event) => setTestMode(event.target.checked)} className="h-5 w-5 accent-yellow-500" />
              </label>
              {testMode && <Input label="Adresse courriel de test" value={testEmail} onChange={setTestEmail} />}
            </div>
            <button onClick={sendEmails} disabled={!selectedRows.length} className="btn-gold w-full disabled:opacity-50">Envoyer à {selectedRows.length} personne(s)</button>
          </Panel>

          <Panel className="lg:col-span-2" title="Historique des envois">
            {!sentLog.length ? (
              <div className="rounded-2xl border border-dashed border-neutral-700 p-8 text-center text-neutral-500">Aucun envoi simulé.</div>
            ) : (
              <div className="space-y-3 max-h-[650px] overflow-auto pr-1">
                {sentLog.map((log) => {
                  const open = openLogId === log.id;
                  return (
                    <div key={log.id} className="rounded-2xl bg-neutral-950 border border-neutral-800 overflow-hidden">
                      <button type="button" onClick={() => setOpenLogId(open ? null : log.id)} className="w-full text-left p-4 hover:bg-neutral-900">
                        <div className="font-semibold">{log.prenom || "Sans prénom"} — {log.email}</div>
                        <div className="text-sm text-yellow-300 mt-1">{log.subject}</div>
                        <div className="text-xs text-neutral-500 mt-1">{log.mode} · {log.date}</div>
                        {log.success ? (
                          <div className="text-xs text-green-300 mt-1">
                            Envoyé via Resend {log.resendId ? `· ${log.resendId}` : ""}
                          </div>
                        ) : (
                          <div className="text-xs text-red-300 mt-1">
                            Non confirmé {log.error ? `· ${log.error}` : ""}
                          </div>
                        )}
                      </button>
                      {open && (
                        <div className="border-t border-neutral-800 bg-white text-black">
                          <div className="bg-neutral-100 border-b p-4">
                            <div className="text-xs text-neutral-500">À : {log.email}</div>
                            <div className="font-bold mt-1">{log.subject}</div>
                          </div>
                          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed p-4 overflow-auto max-h-[400px]">{log.body}</pre>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>
        </div>
      </div>

      <style>{`.btn-gold{background:#eab308;color:#111827;font-weight:700;border-radius:1rem;padding:.7rem 1rem;border:0;cursor:pointer}.btn-gold:hover{background:#facc15}.btn-dark{background:#262626;color:white;border-radius:1rem;padding:.7rem 1rem;border:0;cursor:pointer}.btn-dark:hover{background:#404040}.btn-red{background:#7f1d1d;color:white;border-radius:1rem;padding:.7rem 1rem;border:0;cursor:pointer}.input{width:100%;background:white;color:black;border:1px solid #d4d4d4;border-radius:1rem;padding:.75rem;outline:none}.input:focus{border-color:#eab308}`}</style>
    </div>
  );
}

function InfoBox({ children }) {
  return <div className="rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-200 px-4 py-3 text-sm">{children}</div>;
}

function Panel({ title, children, className = "" }) {
  return <section className={`bg-neutral-900 border border-neutral-800 rounded-3xl shadow-xl p-5 ${className}`}>{title && <h2 className="text-xl font-bold mb-4">{title}</h2>}{children}</section>;
}

function Metric({ title, value, icon, warning, success }) {
  const tone = warning ? "text-yellow-300 bg-yellow-500/10 border-yellow-500/30" : success ? "text-green-300 bg-green-500/10 border-green-500/30" : "text-neutral-200 bg-neutral-900 border-neutral-800";
  return <div className={`rounded-3xl border shadow-xl p-5 flex items-center justify-between ${tone}`}><div><p className="text-sm opacity-75">{title}</p><p className="text-3xl font-bold mt-1">{value}</p></div><div className="text-3xl">{icon}</div></div>;
}

function Input({ label, value, onChange, type = "text" }) {
  return <label className="block space-y-2"><span className="text-sm font-semibold text-white">{label}</span><input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="input" /></label>;
}

function Badge({ children, color }) {
  const className = color === "yellow" ? "bg-yellow-500/15 text-yellow-300 border-yellow-500/30" : "bg-neutral-700 text-neutral-300 border-neutral-600";
  return <span className={`rounded-full border px-2 py-1 text-xs ${className}`}>{children}</span>;
}
