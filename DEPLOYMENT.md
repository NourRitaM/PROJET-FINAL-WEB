# Mise en ligne (version simple)

Ordre conseillé : **base de données → API → site → relier les deux**.
Les noms de boutons des plateformes changent parfois : suivez l'idée, pas le libellé exact.

## 1. Base de données : Neon (ou Supabase)

1. Créer un projet gratuit, copier l'**URL de connexion** PostgreSQL (`postgresql://...`).
2. Sur votre machine, dans `server/.env` : `DATABASE_URL=<cette URL>` et `DB_SSL=true`.
3. `cd server && npm run db:init` : crée les 4 tables dans la base en ligne.

## 2. API : Render (Web Service)

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
