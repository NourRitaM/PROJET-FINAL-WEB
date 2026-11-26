# Capstone Milestones

Every item below is done and can be checked in the code or on the live deployment.

## Milestone 1: Foundations (Session 20)

| Requirement | Status | Where |
|---|---|---|
| One repository with `client/` and `server/` | Done | repository root |
| Both start with `npm run dev` | Done | `client/package.json`, `server/package.json` |
| `.env.example` committed, `.env` ignored | Done | `server/.env.example`, `client/.env.example`, `.gitignore` (root) |
| README with installation steps | Done | `README.md` |
| Wireframes of every screen + navigation arrows | Done | `docs/SCHEMA.md` |
| Schema: collections, fields, types, references | Done | `docs/SCHEMA.md`, `server/db/schema.sql` |

## Milestone 2: Back end (Session 21)

| Requirement | Status | Where |
|---|---|---|
| Signup / login, passwords hashed with bcrypt | Done | `server/routes/auth.js` |
| Login returns a JWT | Done | `server/auth/token.js` |
| `requireAuth` on every private route | Done | all routes (demo routes removed) |
| Missing / wrong token → 401, not a crash | Done | `requireAuth.js`, test in `server/tests/app.test.js` |
| CRUD on the main resource | Done | activities, missions, registrations |
| Every request limited to `req.userId` | Done | `organizer.js`, `registrations.js` |
| Meaningful status codes (201, 400, 404, 409...) | Done | all routes |
| Testable with curl, front end optional | Done | `server/README.md` |
| Session 21 hardening (limiter, body limit, helmet, validation) | Done | `server/app.js`; manual validation in the routes (equivalent of zod) |

## Milestone 3: Front end + back end (Session 22)

| Requirement | Status | Where |
|---|---|---|
| React calls the real API, no fake arrays | Done | `client/src/api/client.js` |
| API URL in `VITE_API_URL` | Done | `client/.env.example` |
| Token sent on every private request | Done | `apiFetch` |
| Loading and error states on screen | Done | all pages (`Loading...`, `role="alert"`) |
| Sign up, log in, log out from the UI | Done | |
| Create / view / edit / delete in the UI | Done | organizer area + volunteer registrations |
| Data survives a refresh | Done | token + user in `localStorage` |
| Tests: 1 component + 1 API route (401 and 400), 4+ green tests | Done | `npm test` in `client/` (44 tests), `server/` (19 tests), `api-tests/` |
| Lighthouse before/after + `PERFORMANCE.md` | Done | `PERFORMANCE.md` |
| `SECURITY.md`: attacks with before/after | Done | `SECURITY.md` |

## Milestone 4: Deployment (Session 23)

| Requirement | Status | Where |
|---|---|---|
| Hosted database | Done | hosted PostgreSQL (`DEPLOYMENT.md`, step 1) |
| API on a public URL | Done | Render (`DEPLOYMENT.md`, step 2) |
| Front end on a public URL | Done | Vercel (`DEPLOYMENT.md`, step 3) |
| Both URLs at the top of the README | Done | `README.md` |
| No hard-coded `localhost` | Done | only development defaults in `.env.example`; `NODE_ENV=production` requires `CLIENT_ORIGIN` |
| The server uses the host's port | Done | `server/server.js` (`process.env.PORT`) |
| `/api/health` | Done | `server/app.js` |
| Refreshing a page: no 404 | Done | `client/vercel.json`, `client/public/_redirects` |
| CI with GitHub Actions (tests before deployment) | Done | `.github/workflows/ci.yml` |
| Sign-up by a stranger from a phone on 4G | Done | live site |

## Additional features

| Feature | Status |
|---|---|
| Email reminders 2 days before (`server/email/reminders.js`, `routes/cron.js`, GitHub workflow) | Done |
| 2-day cancellation deadline + registration pop-up + 409 on the API side | Done |
| Search by activity name | Done |
| `render.yaml` (Render Blueprint) | Done, used for the deployment |

## Running the tests

```bash
cd server && npm install
cd ../client && npm install
cd ../api-tests && npm install
cd ../server && npm test        # 19 tests, no database or port needed
cd ../client && npm test        # 44 tests
# with the database and the API running (npm run db:init && npm run db:seed && npm run dev):
cd ../api-tests && npm test
```
