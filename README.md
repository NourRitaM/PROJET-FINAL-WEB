# Volunteer Activity Organizer

Application web pour organiser des activités de bénévolat : les organisateurs créent des activités avec des missions, les bénévoles s'inscrivent, et la plateforme gère les places, les listes d'attente et les emails.

- **Site en ligne** : https://volunteer-activity-organizer.vercel.app
- **API** : https://volunteer-organizer-api.onrender.com

> La racine de l'API affiche « Volunteer Activity Organizer API is running. ». Les routes `/api/...` sont protégées par un token JWT : une requête directe depuis le navigateur renvoie donc `Missing token`, ce qui est le comportement attendu. Pour tester l'application, utiliser le site.
>
> L'API est hébergée sur l'offre gratuite de Render : après 15 minutes d'inactivité, la première requête peut prendre 30 à 60 secondes.

**Documentation du projet** : suivi des milestones : [`MILESTONES.md`](MILESTONES.md) · sécurité : [`SECURITY.md`](SECURITY.md) · performance : [`PERFORMANCE.md`](PERFORMANCE.md) · schéma et maquettes : [`docs/SCHEMA.md`](docs/SCHEMA.md) · mise en ligne : [`DEPLOYMENT.md`](DEPLOYMENT.md)

## Architecture

| Dossier | Contenu |
|---|---|
| `server/` | API Express + PostgreSQL |
| `client/` | Site React + Vite |
| `api-tests/` | Tests d'intégration et de sécurité de l'API |

**Hébergement** : site sur Vercel, API sur Render, base de données PostgreSQL.

## Répartition du travail

- **Fondations** (Nour Rita) : base de données, authentification, pages de connexion, emails, mise en ligne.
- **Organisateur** (Maria) : `server/routes/organizer.js`, `server/routes/organizerMissions.js`, `client/src/pages/OrganizerPage.jsx`, `client/src/components/MissionVolunteers.jsx`. Le dossier `maria-organizer/` est son prototype de départ : il n'est pas utilisé par l'application.
- **Bénévole** (Mariam) : `server/routes/activities.js`, `missions.js`, `registrations.js` et les pages Activities, détails d'une activité, My registrations.

## Fonctionnalités principales

**Bénévole**
- Inscription et connexion (rôle *volunteer*).
- Liste des activités à venir, avec le nombre de places restantes par mission.
- Recherche par **nom**, date et lieu (`GET /api/activities?title=...`).
- Inscription à une mission, avec liste d'attente automatique quand la mission est pleine.
- Refus des conflits d'horaire (deux missions au même moment le même jour).
- Page « My registrations » : statut `confirmed` ou `waiting list (position N)`.

**Organisateur**
- Création d'activités avec plusieurs missions.
- Liste des bénévoles inscrits sous chaque mission, avec indication « Understaffed » si la mission n'est pas complète.
- Modification d'une mission (le nombre de places peut être augmenté : les bénévoles en attente passent automatiquement `confirmed`).
- Annulation d'une activité (les inscrits sont prévenus par email).
- Export CSV des participants confirmés.

**Règles et emails (Milestone 4)**
- **Délai d'annulation** : un bénévole confirmé peut quitter une mission jusqu'à **2 jours (48 h) avant** l'activité. Le pop-up d'inscription l'annonce ; après ce délai, le bouton est grisé et l'API répond 409 (rien n'est supprimé).
- **Emails** : confirmation à chaque inscription (avec la date limite d'annulation) et **rappel 1 à 2 jours avant** l'activité.
- Chaque page a sa propre adresse (`/activities/12`, `/my-registrations`...) : un rafraîchissement de la page ne produit pas d'erreur 404.
- Règles réglables dans `server/rules.js`.

## Lancer en local

```bash
# 1. API
cd server
npm install
cp .env.example .env     # remplir les variables (voir le tableau ci-dessous)
npm run db:init          # crée les 4 tables
npm run db:seed          # 3 activités de test
npm run dev              # http://localhost:3000

# 2. Site (autre terminal)
cd client
npm install
cp .env.example .env.development
npm run dev              # http://localhost:5173
```

## Variables d'environnement (API)

| Variable | Rôle |
|---|---|
| `DATABASE_URL` | Connexion à la base PostgreSQL |
| `DB_SSL` | Active le SSL pour une base hébergée |
| `JWT_SECRET` | Clé de signature des tokens d'authentification |
| `CLIENT_ORIGIN` | Adresse du site autorisée par le CORS (en production : `https://volunteer-activity-organizer.vercel.app`, sans `/` final) |
| `RESEND_API_KEY` | Clé du service d'envoi d'emails (Resend) |
| `EMAIL_FROM` | Adresse d'expédition des emails |
| `CRON_SECRET` | Protège la route qui envoie les rappels |
| `NODE_ENV` | `development` ou `production` |

## Tests

```bash
cd client && npm test                      # tests React (Vitest + Testing Library)
cd server && npm test                      # tests d'API sans base ni port (supertest sur app.js)
cd api-tests && npm install && npm test    # tests d'intégration + sécurité (API lancée + db:seed fait)
```

## Checklist manuelle (bénévole)

1. Créer un compte **volunteer** (email Gmail / Outlook / iCloud) puis se connecter.
2. **Activities** : la liste s'affiche ; filtrer par date et par lieu (ex. `library`), puis Reset.
3. **View details** : missions, places restantes ; **Register** → « You are registered! ».
4. Re-cliquer n'est plus possible ; un doublon renvoie l'erreur 409 côté API.
5. Mission **Solo mission** (1 place, « Food drive ») : un 2ᵉ bénévole voit « Join the waiting list ».
6. **My registrations** : statut `confirmed` ou `waiting list (position N)`.
7. **Cancel registration** du bénévole confirmé → le premier en attente passe `confirmed`.
8. S'inscrire à une mission de « Food drive » (10:00-15:00) puis à « Library help » (14:00-17:00, même jour) : refusé, message « You already have a mission at the same time ». « Beach cleanup » (autre jour) reste possible.
9. Un compte **organizer** ne voit pas les boutons d'inscription (403 côté API).

## Checklist manuelle (organisateur et liens entre les deux parties)

10. Créer un compte **organizer** (ou, en local après `npm run db:seed`, `seed.organizer@test.dev` / `hunter22`) : « Create Activity » avec 2 missions, puis vérifier « My Activities ».
11. Se connecter en **volunteer** : la nouvelle activité apparaît dans la liste avec `X/Y spot(s) left` par mission. Une activité dont la date est passée n'apparaît pas.
12. Le bénévole s'inscrit ; l'organisateur voit son nom sous la mission. Une mission non complète affiche « Understaffed ».
13. Mission pleine : un 2ᵉ bénévole est sur la liste d'attente ; l'organisateur **augmente le nombre de places** (Edit Mission) → le 2ᵉ bénévole passe `confirmed` dans « My registrations ».
14. L'organisateur clique **Cancel Activity** : elle disparaît de la liste des bénévoles, « My registrations » affiche « This activity was cancelled », et un email part aux inscrits (si `RESEND_API_KEY` est renseignée).
15. **Export Participants CSV** télécharge la liste des participants confirmés.

*Note : les dates du seed sont calculées (Beach cleanup = J+14, Food drive et Library help = J+21) : relancer `npm run db:seed` suffit pour avoir des activités « à venir ». Les tests d'API ne dépendent d'aucune date écrite en dur.*
