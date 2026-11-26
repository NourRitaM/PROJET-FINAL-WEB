# Volunteer Activity Organizer

A web application for organizing volunteer activities: organizers create activities made of missions, volunteers register for them, and the platform handles available places, waiting lists and email notifications.

- **Live site**: https://volunteer-activity-organizer.vercel.app
- **API**: https://volunteer-organizer-api.onrender.com

> The API root displays "Volunteer Activity Organizer API is running." and `/api/health` returns `{"status":"ok"}`. The other `/api/...` routes are protected by a JWT: opening one directly in a browser returns `Missing token`, which is the expected behavior. To try the application, use the live site.
>
> The API runs on Render's free plan: after 15 minutes of inactivity, the first request can take 30 to 60 seconds.

**Project documentation**: milestone tracking: [`MILESTONES.md`](MILESTONES.md) · security: [`SECURITY.md`](SECURITY.md) · performance: [`PERFORMANCE.md`](PERFORMANCE.md) · schema and wireframes: [`docs/SCHEMA.md`](docs/SCHEMA.md) · deployment: [`DEPLOYMENT.md`](DEPLOYMENT.md)

## Architecture

| Folder | Content |
|---|---|
| `server/` | Express API + PostgreSQL |
| `client/` | React + Vite website |
| `api-tests/` | API integration and security tests |

**Hosting**: website on Vercel, API on Render, PostgreSQL database.

## Team contributions

- **Foundations** (Nour Rita): database, authentication, login pages, emails, deployment.
- **Organizer** (Maria): `server/routes/organizer.js`, `server/routes/organizerMissions.js`, `client/src/pages/OrganizerPage.jsx`, `client/src/components/MissionVolunteers.jsx`. The `maria-organizer/` folder is her starting prototype and is not used by the application.
- **Volunteer** (Mariam): `server/routes/activities.js`, `missions.js`, `registrations.js` and the Activities, activity details and My registrations pages.

## Main features

**Volunteer**
- Sign up and log in (*volunteer* role).
- List of upcoming activities, with the number of places left per mission.
- Search by **name**, date and location (`GET /api/activities?title=...`).
- Registration to a mission, with an automatic waiting list when the mission is full.
- Schedule conflicts are rejected (two missions at the same time on the same day).
- "My registrations" page: status `confirmed` or `waiting list (position N)`.

**Organizer**
- Creation of activities with several missions.
- List of registered volunteers under each mission, with an "Understaffed" label when a mission is not full.
- Mission editing (places can be increased: waiting volunteers automatically become `confirmed`).
- Activity cancellation (registered volunteers are notified by email).
- CSV export of confirmed participants.

**Rules and emails (Milestone 4)**
- **Cancellation deadline**: a confirmed volunteer can leave a mission up to **2 days (48 h) before** the activity. The registration pop-up states it; after the deadline the button is disabled and the API answers 409 (nothing is deleted).
- **Emails**: a confirmation at every registration (with the cancellation deadline) and a **reminder 1 to 2 days before** the activity.
- Every page has its own address (`/activities/12`, `/my-registrations`...): refreshing a page does not produce a 404.
- Rules are configurable in `server/rules.js`.

## Running locally

```bash
# 1. API
cd server
npm install
cp .env.example .env     # fill in the variables (see the table below)
npm run db:init          # creates the 4 tables
npm run db:seed          # 3 test activities
npm run dev              # http://localhost:3000

# 2. Website (another terminal)
cd client
npm install
cp .env.example .env.development
npm run dev              # http://localhost:5173
```

## Environment variables (API)

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `DB_SSL` | Enables SSL for a hosted database |
| `JWT_SECRET` | Key used to sign authentication tokens |
| `CLIENT_ORIGIN` | Website address allowed by CORS (in production: `https://volunteer-activity-organizer.vercel.app`, no trailing `/`). Must be updated if the website address changes. |
| `RESEND_API_KEY` | API key of the email service (Resend) |
| `EMAIL_FROM` | Sender address of the emails |
| `CRON_SECRET` | Protects the route that sends reminders |
| `NODE_ENV` | `development` or `production` |

The website reads the API address from `VITE_API_URL` at build time.

## Tests

```bash
cd client && npm test                      # React tests (Vitest + Testing Library)
cd server && npm test                      # API tests without database or port (supertest on app.js)
cd api-tests && npm install && npm test    # integration + security tests (API running and db:seed done)
```

## Manual checklist (volunteer)

1. Create a **volunteer** account (Gmail / Outlook / iCloud email) and log in.
2. **Activities**: the list is displayed; filter by date and by location (e.g. `library`), then Reset.
3. **View details**: missions, remaining places; **Register** → "You are registered!".
4. Clicking again is no longer possible; a duplicate returns a 409 error on the API side.
5. **Solo mission** (1 place, "Food drive"): a 2nd volunteer sees "Join the waiting list".
6. **My registrations**: status `confirmed` or `waiting list (position N)`.
7. **Cancel registration** by the confirmed volunteer → the first volunteer on the waiting list becomes `confirmed`.
8. Register for a "Food drive" mission (10:00-15:00), then for "Library help" (14:00-17:00, same day): refused with "You already have a mission at the same time". "Beach cleanup" (another day) remains possible.
9. An **organizer** account does not see the registration buttons (403 on the API side).

## Manual checklist (organizer and links between both sides)

10. Create an **organizer** account (or, locally after `npm run db:seed`, `seed.organizer@test.dev` / `hunter22`): "Create Activity" with 2 missions, then check "My Activities".
11. Log in as a **volunteer**: the new activity appears in the list with `X/Y spot(s) left` per mission. An activity whose date has passed does not appear.
12. The volunteer registers; the organizer sees their name under the mission. A mission that is not full shows "Understaffed".
13. Full mission: a 2nd volunteer is on the waiting list; the organizer **increases the number of places** (Edit Mission) → the 2nd volunteer becomes `confirmed` in "My registrations".
14. The organizer clicks **Cancel Activity**: it disappears from the volunteers' list, "My registrations" shows "This activity was cancelled", and an email is sent to registered volunteers (if `RESEND_API_KEY` is set).
15. **Export Participants CSV** downloads the list of confirmed participants.

*Note: the seed dates are computed (Beach cleanup = D+14, Food drive and Library help = D+21): running `npm run db:seed` again is enough to get "upcoming" activities. The API tests do not depend on any hard-coded date.*
