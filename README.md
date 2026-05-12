# Outil d'envoi de courriels Karaté Sunfuki

Application React + Netlify Function pour importer un CSV, filtrer les commandes et envoyer des courriels via Resend.

## Structure

```txt
sunfuki-email-tool/
├── netlify/functions/send-emails.js
├── src/App.jsx
├── src/main.jsx
├── src/index.css
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── netlify.toml
└── .gitignore
```

## Installation locale

```bash
npm install
npm run dev
```

## Déploiement Netlify

1. Créer un dépôt GitHub avec ces fichiers.
2. Aller dans Netlify > Add new site > Import from Git.
3. Sélectionner le dépôt.
4. Vérifier les paramètres :
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Functions directory: `netlify/functions`
5. Ajouter les variables d'environnement dans Netlify :
   - `RESEND_API_KEY` : votre clé API Resend.
   - Optionnel : `RESEND_FROM_EMAIL`, ex. `Karaté Sunfuki <noreply@boutique-karatesunfuki.com>`.
   - Optionnel : `RESEND_REPLY_TO`, ex. `commandes@boutique-karatesunfuki.com`.
6. Déployer.

## Important Resend

L'adresse expéditeur doit utiliser un domaine validé dans Resend. Sinon Resend refusera l'envoi.

Exemple :

```txt
Karaté Sunfuki <noreply@boutique-karatesunfuki.com>
```

## Utilisation

1. Importer le CSV.
2. Filtrer par type de formulaire, équipe ou produit.
3. Vérifier les lignes cochées.
4. Choisir le template.
5. Garder le mode test activé pour faire un premier envoi vers votre adresse.
6. Cliquer sur « Activer l'envoi via Netlify ».
7. Envoyer.

## Sécurité

La clé Resend ne doit jamais être dans le frontend React. Elle est utilisée uniquement côté serveur dans la fonction Netlify.
