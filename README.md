# PROJET-FINAL-WEB — Volunteer Activity Organizer

**Site en ligne** : A REMPLIR (URL Vercel) · **API en ligne** : A REMPLIR (URL Render, `/api/health`)

Suivi des milestones : voir [`MILESTONES.md`](MILESTONES.md) · securite : [`SECURITY.md`](SECURITY.md) · performance : [`PERFORMANCE.md`](PERFORMANCE.md) · schema et maquettes : [`docs/SCHEMA.md`](docs/SCHEMA.md) · mise en ligne : [`DEPLOYMENT.md`](DEPLOYMENT.md)

Application web : API Express + PostgreSQL (`server/`), site React + Vite (`client/`), tests d'API (`api-tests/`).

- **Fondations** (Nour Rita) : base, authentification, pages de connexion, emails, mise en ligne.
- **Organisateur** (Maria) : `server/routes/organizer.js`, `server/routes/organizerMissions.js`, `client/src/pages/OrganizerPage.jsx`, `client/src/components/MissionVolunteers.jsx`. Le dossier `maria-organizer/` est son prototype de depart : il n'est pas utilise par l'application.
- **Benevole** (Mariam) : `server/routes/activities.js`, `missions.js`, `registrations.js` et les pages Activities, details, My registrations.

## Lancer en local

```bash
# 1. API
cd server
npm install
cp .env.example .env     # remplir DATABASE_URL et JWT_SECRET
npm run db:init          # cree les 4 tables
npm run db:seed          # 3 activites de test
npm run dev              # http://localhost:3000

# 2. Site (autre terminal)
cd client
npm install
cp .env.example .env.development
npm run dev              # http://localhost:5173
```

## Tests

```bash
cd client && npm test                 # tests React (Vitest + Testing Library)
cd server && npm test                 # tests d'API sans base ni port (supertest sur app.js)
cd api-tests && npm install && npm test   # tests d'integration + securite (API lancee + db:seed fait)
```

## Checklist manuelle (benevole)

1. Creer un compte **volunteer** (email Gmail / Outlook / iCloud) puis se connecter.
2. **Activities** : la liste s'affiche ; filtrer par date et par lieu (ex. `library`), puis Reset.
3. **View details** : missions, places restantes ; **Register** -> "You are registered!".
4. Re-cliquer n'est plus possible ; un doublon renvoie l'erreur 409 cote API.
5. Mission **Solo mission** (1 place, "Food drive") : un 2e benevole voit "Join the waiting list".
6. **My registrations** : statut `confirmed` ou `waiting list (position N)`.
7. **Cancel registration** du benevole confirme -> le premier en attente passe `confirmed`.
8. S'inscrire a une mission de « Food drive » (10:00-15:00) puis a « Library help » (14:00-17:00, meme jour) : refuse, message « You already have a mission at the same time ». « Beach cleanup » (autre jour) reste possible.
9. Un compte **organizer** ne voit pas les boutons d'inscription (403 cote API).

## Checklist manuelle (organisateur et liens entre les deux parties)

10. Creer un compte **organizer** (ou `seed.organizer@test.dev` / `hunter22`) : « Create Activity » avec 2 missions, puis verifier « My Activities ».
11. Se connecter en **volunteer** : la nouvelle activite apparait dans la liste avec `X/Y spot(s) left` par mission. Une activite dont la date est passee n'apparait pas.
12. Le benevole s'inscrit ; l'organisateur voit son nom sous la mission. Une mission non complete affiche « Understaffed ».
13. Mission pleine : un 2e benevole est sur la liste d'attente ; l'organisateur **augmente le nombre de places** (Edit Mission) -> le 2e benevole passe `confirmed` dans « My registrations ».
14. L'organisateur clique **Cancel Activity** : elle disparait de la liste des benevoles, « My registrations » affiche « This activity was cancelled », et un email part aux inscrits (si `RESEND_API_KEY` est renseigne).
15. **Export Participants CSV** telecharge la liste des participants confirmes.

Note : les dates du seed sont calculees (Beach cleanup = J+14, Food drive et Library help = J+21) : relancer `npm run db:seed` suffit pour avoir des activites « a venir ». Les tests d'API ne dependent d'aucune date ecrite en dur.
