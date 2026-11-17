# SECURITY.md : Session 21, "Break it, then harden it"

Chaque trou : **attaque -> reponse AVANT -> correction -> reponse APRES**.
Les attaques sont executables : `cd api-tests && npm test -- security` (API lancee + `db:seed`).
Les cases `A REMPLIR` sont a completer avec TA reponse reelle (copie le curl et la reponse).

| # | Trou | Attaque | Correction dans le code | Etat |
|---|------|---------|-------------------------|------|
| 1 | IDOR | Un organisateur B modifie / supprime l'activite ou la mission de A ; un benevole annule l'inscription d'un autre | Toutes les requetes filtrent par `id` ET proprietaire (`organizer_id = $2`, `user_id = $2`) -> 404 | Corrige des le depart |
| 2 | Mass assignment | `POST` avec `"role":"admin"`, `"organizer_id":1`, `"status":"cancelled"` | Le role est verifie (`organizer`/`volunteer` seulement), l'identite vient de `req.userId` (token), les champs sont lus un par un | Corrige des le depart |
| 3 | Injection | `?location=' OR '1'='1`, email `{ "$ne": "x" }`, id `1;DROP TABLE users` | Requetes parametrees (`$1`), verification du TYPE (`typeof x === 'string'`), ids convertis avec `Number()` | Corrige des le depart |
| 4 | XSS | Titre `<img src=x onerror=alert(1)>` | React affiche en texte ; aucun `dangerouslySetInnerHTML` ; emails : `esc()` ; helmet (CSP) | Corrige des le depart |
| 5 | Force brute | 20 mauvais logins d'affilee | `loginLimiter` : 5 echecs / 15 min -> **429** | **Ajoute** (avant : jamais bloque) |
| 6 | Taille du body | Body de 5 Mo sur `/signup` | `express.json({ limit: '10kb' })` -> **413** | **Ajoute** |
| 7 | Inondation | 1000 requetes/min | `apiLimiter` : 300 / 15 min -> 429 | **Ajoute** |
| 8 | En-tetes | `curl -I` sur l'API | `helmet()` (CSP, HSTS, nosniff), `X-Powered-By` retire | Corrige des le depart |
| 9 | Secrets | `git log -p \| grep SECRET` | `.env` dans `.gitignore` (racine + server + client), `.env.example`, crash au demarrage si secret manquant, `NODE_ENV=production` exige `CLIENT_ORIGIN` | Corrige / complete |
| 10 | Routes de demo | `GET /api/demo/organizer` | Routes **supprimees** de l'API | **Corrige** |
| 11 | JWT | Token forge avec `alg: none` | `jwt.verify(..., { algorithms: ['HS256'] })` | **Ajoute** |

## Preuves avant / apres (a completer)

Pour les trous 5, 6, 7, 10 et 11, le "avant" est le code de ton ancien `server.js`
(pas de limiter, `express.json()` sans limite, routes `/api/demo/*`, `jwt.verify` sans liste d'algorithmes).
Pour chaque trou, colle ici la vraie requete et la vraie reponse :

### Trou 5 : force brute
- Attaque : `for i in $(seq 1 20); do curl -s -o /dev/null -w "%{http_code}\n" -X POST localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{"email":"a@b.co","password":"wrongpass1"}'; done`
- Avant : A REMPLIR (20 x `401`, jamais de 429)
- Apres : A REMPLIR (5 x `401` puis `429`)

### Trou 6 : body trop gros
- Attaque : `curl -X POST localhost:3000/api/auth/signup -H "Content-Type: application/json" -d "{\"name\":\"$(head -c 20000 /dev/zero | tr '\0' x)\"}"`
- Avant : A REMPLIR
- Apres : A REMPLIR (`413`)

### Trou 10 : routes de demo
- Attaque : `curl -i localhost:3000/api/demo/organizer -H "Authorization: Bearer <token>"`
- Avant : A REMPLIR (200 / 403)
- Apres : A REMPLIR (404)

## Limite connue (a mentionner a l'oral)
Le token est dans `localStorage` : un XSS pourrait le lire (Session 21 / 19). C'est accepte pour le cours ;
en production on utiliserait un cookie `httpOnly; secure; sameSite=lax`.
