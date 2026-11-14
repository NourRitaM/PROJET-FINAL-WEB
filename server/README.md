# Volunteer Activity Organizer — Back end (base + authentification)

API Express + PostgreSQL. Cette partie contient **la connexion à la base, les 4 tables, l'authentification (bcrypt + JWT) et les middlewares de token et de rôle**. Les routes activities / missions / registrations sont à ajouter par l'équipe.

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
├── server.js               # connexion DB puis listen, middlewares, routes
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
| GET | `/api/demo/organizer` | organizer | 200 | 401, 403 |
| GET | `/api/demo/volunteer` | volunteer | 200 | 401, 403 |

Les deux routes `/api/demo/*` servent uniquement à tester les rôles : à supprimer ensuite.

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
