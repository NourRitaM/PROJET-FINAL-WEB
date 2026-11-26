# Mise en ligne (version simple)

Ordre conseillé : **base de données → API → site → relier les deux**.
Les noms de boutons des plateformes changent parfois : suivez l'idée, pas le libellé exact.

## 1. Base de données : Neon (ou Supabase)

1. Créer un projet gratuit, copier l'**URL de connexion** PostgreSQL (`postgresql://...`).
2. Sur votre machine, dans `server/.env` : `DATABASE_URL=<cette URL>` et `DB_SSL=true`.
3. `cd server && npm run db:init` : crée les 4 tables dans la base en ligne.

   Base déjà créée avant l'ajout des rappels ? Relancer `npm run db:init` une fois : il ajoute la colonne
   `registrations.reminder_sent_at` sans rien effacer.

## 2. API : Render (Web Service)

**Le plus simple : le Blueprint.** Render → **New → Blueprint** → choisir ce dépôt. Le fichier `render.yaml`
remplit tous les réglages ; Render génère `JWT_SECRET` et `CRON_SECRET` et vous demande seulement
`DATABASE_URL`, `CLIENT_ORIGIN` (à remettre à l'étape 4), `RESEND_API_KEY` et `EMAIL_FROM`.
La commande de build lance aussi `npm run db:init` : les tables sont créées (ou mises à jour) à chaque déploiement.

**À la main** (si vous préférez) : Build Command `npm install && npm run db:init`, et ajouter `CRON_SECRET`
(valeur aléatoire, voir « Rappels » plus bas).

1. Nouveau **Web Service** relié à votre dépôt GitHub.
2. **Root Directory** : `server` · **Build Command** : `npm install` · **Start Command** : `npm start`.
3. Variables d'environnement (réglages de Render, jamais dans git) :

| Variable | Valeur |
|---|---|
| `DATABASE_URL` | l'URL Neon / Supabase |
| `DB_SSL` | `true` |
| `JWT_SECRET` | une **nouvelle** valeur : `node -p "require('crypto').randomBytes(32).toString('hex')"` |
| `NODE_ENV` | `production` (le serveur refuse alors de démarrer sans `CLIENT_ORIGIN`) |
| `CLIENT_ORIGIN` | l'adresse du site Vercel, en `https://`, **sans `/` final** (à remplir à l'étape 4) |
| `RESEND_API_KEY`, `EMAIL_FROM` | voir étape 5 |

4. Vérifier `https://VOTRE-API.onrender.com/api/health` → `{"status":"ok"}`.
   (Offre gratuite : le premier appel après une pause peut prendre une minute.)

## 3. Site : Vercel

1. **New Project** relié au même dépôt.
2. **Root Directory** : `client` · Framework : Vite · Build : `npm run build` · Output : `dist`.
3. Variable d'environnement : `VITE_API_URL=https://VOTRE-API.onrender.com` (sans `/` final). Elle est lue **au build** : si tu la changes, redéploie.
   Le fichier `client/vercel.json` (déjà dans le projet) évite le 404 au rafraîchissement d'une page ; pour Netlify, `client/public/_redirects` fait la même chose.
4. Déployer, puis copier l'adresse du site.

## 4. Relier les deux

Dans Render, mettre `CLIENT_ORIGIN` = adresse Vercel exacte (même `https://`, pas de `/` final) et redéployer.
Erreur CORS dans la console = ces deux adresses ne correspondent pas exactement.

## 5. Emails : Resend

1. Créer un compte Resend et une **clé API** → `RESEND_API_KEY` dans Render.
2. Sans domaine vérifié, laisser `EMAIL_FROM` vide (`onboarding@resend.dev`) : Resend n'envoie alors
   **qu'à l'adresse du compte Resend** — suffisant pour tester l'inscription avec votre propre email.
   Pour écrire à n'importe qui, vérifier un domaine dans Resend et mettre `EMAIL_FROM=Nom <adresse@votre-domaine>`.
3. Sans `RESEND_API_KEY`, l'API fonctionne normalement : l'email est simplement ignoré (un avertissement dans les logs).

Où sont les deux emails :
- **Inscription confirmée** : envoyé automatiquement à la création du compte (`server/routes/auth.js`).
- **Activité annulée** : `notifyActivityCancelled(activityId)` est déjà appelée par `PATCH /api/organizer/activities/:id` avec `{ status: 'cancelled' }`.

## 6. CI (GitHub Actions)

`.github/workflows/ci.yml` lance `npm test` côté `server/` et `client/` (et `npm run build`) à chaque push et pull request. Rouge = ne pas déployer. Render peut déployer automatiquement après un CI vert.

## 7. Vérification finale

```bash
cd api-tests && API_URL=https://VOTRE-API.onrender.com npm test
```
Puis la checklist manuelle du `README.md` sur l'adresse Vercel.

## Si ça ne marche pas : les 4 suspects

- `blocked by CORS policy` : `CLIENT_ORIGIN` ne correspond pas exactement à l'adresse Vercel.
- Le site appelle `localhost:3000` : `VITE_API_URL` absente au build -> la définir puis redéployer.
- 404 au rafraîchissement : `vercel.json` manquant.
- Le serveur s'arrête au démarrage : variable d'environnement manquante, ou Neon/Supabase refuse la connexion (`DB_SSL=true`).

Site cassé -> onglet Network. API cassée -> logs de Render.

## Rappels par email (2 jours avant) : les faire partir même quand Render dort

L'API vérifie les rappels au démarrage puis toutes les heures. Sur l'offre gratuite, Render endort l'API
après ~15 min sans visite : le workflow `.github/workflows/reminders.yml` la réveille chaque jour (06:00 UTC)
en appelant `POST /api/cron/reminders`. À faire une fois :

1. Render : variable `CRON_SECRET` (générée par le Blueprint).
2. GitHub : **Settings → Secrets and variables → Actions → New repository secret** :
   `API_URL` = `https://VOTRE-API.onrender.com` (sans `/` final) et `CRON_SECRET` = la même valeur que dans Render.
3. Tester : onglet **Actions → Reminder emails → Run workflow**. Réponse attendue : `{"due":0,"sent":0}`.

## Vérification finale (Milestone 4)

```bash
cd api-tests && API_URL=https://VOTRE-API.onrender.com npm test
```
- `https://VOTRE-API.onrender.com/api/health` → `{"status":"ok"}`
- **Depuis un téléphone en 4G** : créer un compte, s'inscrire à une mission, rafraîchir la page (pas de 404).
- Remplacer les deux `A REMPLIR` en haut du `README.md` par les vraies adresses, puis
  `git tag milestone-4 && git push --tags`.
