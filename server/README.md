# Volunteer Activity Organizer — Back end (base + authentification)

API Express + PostgreSQL. Cette partie contient **la connexion à la base, les 4 tables, l'authentification (bcrypt + JWT) et les middlewares de token et de rôle**. Les routes activities / missions / registrations (partie bénévole) sont aussi incluses.

## Installation

```bash
cd server
npm install
cp .env.example .env      # puis remplir DATABASE_URL et JWT_SECRET
npm run db:init           # crée les 4 tables (relançable sans risque)
npm run dev               # doit afficher : connected to PostgreSQL
```

Base en local : `createdb volunteer_organizer`. Avec Supabase / Neon : coller l'URL de connexion dans `DATABASE_URL` et mettre `DB_SSL=true`.

Générer un `JWT_SECRET` :
```bash
node -p "require('crypto').randomBytes(32).toString('hex')"
```

## Structure

```
server/
├── app.js                  # l'application Express (middlewares, limiteurs, routes), sans port ni base
├── server.js               # vérifie la config, connecte la base, puis listen
├── tests/app.test.js       # tests supertest sans base (npm test)
├── db/
│   ├── pool.js             # connexion PostgreSQL + query()
│   ├── schema.sql          # users, activities, missions, registrations
│   └── init.js             # npm run db:init
├── auth/token.js           # signToken / verifyToken (JWT)
├── middleware/
│   ├── requireAuth.js      # vérifie le token -> req.userId, req.userRole
│   └── requireRole.js      # vérifie le rôle (organizer / volunteer)
└── routes/auth.js          # signup, login, logout, me
```

## Routes

| Méthode | Chemin | Accès | Succès | Erreurs |
|---|---|---|---|---|
| POST | `/api/auth/signup` | public | 201 `{ token, user }` | 400 données invalides, 409 email déjà pris |
| POST | `/api/auth/login` | public | 200 `{ token, user }` | 400 champs manquants, 401 identifiants faux |
| POST | `/api/auth/logout` | token | 200 `{ message }` | 401 |
| GET | `/api/auth/me` | token | 200 `{ id, name, email, role }` | 401, 404 |
| GET | `/api/activities?date=YYYY-MM-DD&location=texte` | token | 200 activites a venir + `missions` (`spots_left`/`spots_needed`), filtres optionnels | 400 date/location invalide, 401 |
| GET | `/api/activities/:id` | token | 200 activité + missions (`spots_left`, `my_status`) | 401, 404 |
| POST | `/api/missions/:id/register` | volunteer | 201 `{ id, status }` (`confirmed` ou `waiting` si complet) | 401, 403, 404, 409 déjà inscrit ou autre mission à la même heure |
| GET | `/api/registrations/mine` | volunteer | 200 mes inscriptions (+ `waiting_position`) | 401, 403 |
| DELETE | `/api/registrations/:id` | volunteer | 200 `{ message, promoted }` | 401, 403, 404 |
| GET | `/api/organizer/activities` | organizer | 200 mes activites + missions + inscrits confirmes | 401, 403 |
| POST | `/api/organizer/activities` | organizer | 201 activite creee avec ses missions (transaction) | 400, 401, 403 |
| PATCH | `/api/organizer/activities/:id` | organizer | 204 : modifier, ou `{ status: 'cancelled' }` (envoie les emails d'annulation) | 400, 404 |
| POST | `/api/organizer/activities/:id/missions` | organizer | 201 mission ajoutee | 400, 404 |
| PATCH | `/api/organizer/activities/:id/missions/:missionId` | organizer | 204 (si la capacite augmente, la liste d'attente avance) | 400, 404, 409 |
| DELETE | `/api/organizer/activities/:id/missions/:missionId` | organizer | 204 | 404, 409 mission avec inscrits ou derniere mission |

Les routes de démonstration `/api/demo/*` ont été supprimées (production-ready, Session 23).

## Tester avec curl

```bash
# 1. Inscription d'un organisateur et d'un bénévole
curl -X POST localhost:3000/api/auth/signup -H "Content-Type: application/json" \
  -d '{"name":"Alice","email":"alice@uni.edu","password":"hunter22","role":"organizer"}'
curl -X POST localhost:3000/api/auth/signup -H "Content-Type: application/json" \
  -d '{"name":"Bob","email":"bob@uni.edu","password":"hunter22","role":"volunteer"}'

# 2. Même email -> 409
curl -i -X POST localhost:3000/api/auth/signup -H "Content-Type: application/json" \
  -d '{"name":"Alice","email":"alice@uni.edu","password":"hunter22","role":"organizer"}'

# 3. Connexion (renvoie le token)
curl -X POST localhost:3000/api/auth/login -H "Content-Type: application/json" \
  -d '{"email":"alice@uni.edu","password":"hunter22"}'

# 4. Sans token -> 401
curl -i localhost:3000/api/auth/me

# 5. Avec token (remplacer <TOKEN>)
curl localhost:3000/api/auth/me -H "Authorization: Bearer <TOKEN>"

# 6. Rôles : le token de Bob (volunteer) sur la route organizer -> 403
curl -i localhost:3000/api/demo/organizer -H "Authorization: Bearer <TOKEN_BOB>"

# 7. Déconnexion
curl -X POST localhost:3000/api/auth/logout -H "Authorization: Bearer <TOKEN>"
```

Pour vérifier le hachage : `SELECT email, password_hash FROM users;` doit montrer des valeurs `$2b$12$...`, jamais le mot de passe.

## Pour les deux autres membres : utiliser la base et l'auth

**Requêtes SQL** (toujours paramétrées, jamais de valeurs collées dans la chaîne) :
```js
import { query } from '../db/pool.js';

const { rows } = await query('SELECT * FROM missions WHERE activity_id = $1', [activityId]);
```

**Protéger une route** :
```js
import express from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireRole } from '../middleware/requireRole.js';

const router = express.Router();

// tout utilisateur connecté
router.get('/', requireAuth, listActivities);

// organisateur seulement
router.post('/', requireAuth, requireRole('organizer'), createActivity);

// bénévole seulement
router.post('/:id/register', requireAuth, requireRole('volunteer'), register);
```
(`requireRole` se place toujours **après** `requireAuth`.)

Puis dans `server.js` : `app.use('/api/activities', activitiesRouter);`

**Règles à respecter** (Session 21) :
- L'identité vient de `req.userId`, **jamais** du body. Exemple : `organizer_id = req.userId` à la création d'une activité.
- Pour modifier/supprimer une activité, filtrer par id **et** propriétaire : `WHERE id = $1 AND organizer_id = $2`, et répondre 404 si rien n'est trouvé.
- Doublon d'inscription : la base refuse déjà (`UNIQUE (mission_id, user_id)`). L'erreur PostgreSQL a le code `23505` : l'attraper et répondre 409.
- Un id dans l'URL est une chaîne : `Number(req.params.id)`.

## Remarques sur le schéma

- Les « enum » du schéma (role, status) sont faits avec `CHECK (... IN (...))` : même effet, plus simple à relancer.
- Suppression en cascade : supprimer une activité supprime ses missions et leurs inscriptions.
- « Places restantes » = `spots_needed` − nombre d'inscriptions `confirmed` de la mission.
- Le rôle est écrit dans le token à la connexion (valable 1 h).

## Données de test et tests d'API

```bash
cd server && npm run db:seed   # 3 activités de test (dont une mission à 1 seule place)
npm run dev
cd ../api-tests && npm install && npm test
```
