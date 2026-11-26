# Suivi des milestones du Capstone

Legende : OK = fait et verifiable dans le code | A FAIRE (toi) = je ne peux pas le faire a ta place | A VERIFIER = code pret, il faut lancer et constater.

## Milestone 1 : Foundations (Session 20)

| Exigence | Etat | Ou |
|---|---|---|
| Un repo avec `client/` et `server/` | OK | racine |
| Les deux demarrent avec `npm run dev` | OK | `client/package.json`, `server/package.json` |
| `.env.example` commite, `.env` ignore | OK | `server/.env.example`, `client/.env.example`, `.gitignore` (racine) |
| README avec les etapes d'installation | OK | `README.md` |
| Wireframes de chaque ecran + fleches de navigation | OK | `docs/SCHEMA.md` |
| Schema : collections, champs, types, references | OK | `docs/SCHEMA.md`, `server/db/schema.sql` |

## Milestone 2 : Back end (Session 21)

| Exigence | Etat | Ou |
|---|---|---|
| Signup / login, mots de passe hashes avec bcrypt | OK | `server/routes/auth.js` |
| Login renvoie un JWT | OK | `server/auth/token.js` |
| `requireAuth` sur chaque route privee | OK | toutes les routes (`demo` supprimees) |
| Token manquant / mauvais -> 401, pas un crash | OK | `requireAuth.js`, test `server/tests/app.test.js` |
| CRUD sur la ressource principale | OK | activites, missions, inscriptions |
| Chaque requete limitee a `req.userId` | OK | `organizer.js`, `registrations.js` |
| Codes qui ont un sens (201, 400, 404, 409...) | OK | |
| Testable avec curl, front optionnel | OK | `server/README.md` |
| Durcissement Session 21 (limiter, body max, helmet, zod ou equivalent) | OK | `server/app.js` ; validation manuelle (equivalent de zod) dans les routes |

## Milestone 3 : Front end + back end (Session 22)

| Exigence | Etat | Ou |
|---|---|---|
| React appelle la vraie API, pas de tableaux factices | OK | `client/src/api/client.js` |
| URL de l'API dans `VITE_API_URL` | OK | `client/.env.example` |
| Token envoye sur chaque requete privee | OK | `apiFetch` |
| Etats de chargement et d'erreur a l'ecran | OK | toutes les pages (`Loading...`, `role="alert"`) |
| Sign up, log in, log out depuis l'UI | OK | |
| Creer / voir / modifier / supprimer dans l'UI | OK | espace organisateur + inscriptions benevole |
| Les donnees survivent a un refresh | OK | token + user dans `localStorage` |
| Tests : 1 composant + 1 route API (401 et 400), 4+ tests verts | OK (code) / A VERIFIER (les lancer) | `npm test` dans `client/`, `server/`, `api-tests/` |
| "Casser le code une fois et voir un test echouer" | A FAIRE (toi) | change un texte dans `NoteCard`/`Navbar`, lance `npm test`, annule |
| Lighthouse avant/apres + `PERFORMANCE.md` | A FAIRE (toi) | le fichier est pret, remplis les `A REMPLIR` |
| `SECURITY.md` : 3 attaques avant/apres | A FAIRE (toi) | le fichier est pret, remplis les `A REMPLIR` |

## Milestone 4 : Deploiement (Session 23)

| Exigence | Etat | Ou |
|---|---|---|
| Base cloud | A FAIRE (toi) | Neon / Supabase (`DEPLOYMENT.md` etape 1) |
| API sur une URL publique | A FAIRE (toi) | Render (`DEPLOYMENT.md` etape 2) |
| Front sur une URL publique | A FAIRE (toi) | Vercel (`DEPLOYMENT.md` etape 3) |
| Les deux URLs en haut du README | A FAIRE (toi) | remplace les `A REMPLIR` du `README.md` |
| Pas de `localhost` en dur | OK | seules valeurs par defaut de dev dans `.env.example` ; `NODE_ENV=production` exige `CLIENT_ORIGIN` |
| Pas de `.env` dans le repo | OK (archive) / A VERIFIER (`git log -p \| grep SECRET`) | |
| Le serveur utilise le port de l'hebergeur | OK | `server/server.js` (`process.env.PORT`) |
| `/api/health` | OK | `server/app.js` |
| Refresh d'une page : pas de 404 | OK | `client/vercel.json`, `client/public/_redirects` |
| CI GitHub Actions (tests avant le deploiement) | OK | `.github/workflows/ci.yml` |
| Inscription d'un inconnu depuis le telephone en 4G | A FAIRE (toi) | |

## Ajouts de cette version

| Ajout | Etat |
|---|---|
| Rappels par email 2 jours avant (`server/email/reminders.js`, `routes/cron.js`, workflow GitHub) | OK (code) / A FAIRE (toi) : secrets GitHub + `RESEND_API_KEY` |
| Delai d'annulation 2 jours + pop-up d'inscription + 409 cote API | OK (code) / A VERIFIER : `npm test` |
| Recherche par nom d'activite | OK (code) / A VERIFIER : `npm test` |
| `render.yaml` (Blueprint) | OK ; deploiement reel : A FAIRE (toi) |

## Commandes a lancer une fois

```bash
cd server && npm install        # IMPORTANT : ajoute express-rate-limit, vitest, supertest et met a jour package-lock.json -> commite-le
cd ../client && npm install
cd ../api-tests && npm install
cd ../server && npm test        # 19 tests sans base ni port
cd ../client && npm test
# avec la base et l'API lancees (npm run db:init && npm run db:seed && npm run dev) :
cd ../api-tests && npm test
```
