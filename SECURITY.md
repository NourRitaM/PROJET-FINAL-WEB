# SECURITY.md — Session 21, "Break it, then harden it"

For each weakness: **attack → fix → behavior of the hardened API**.
The attacks are executable: `cd api-tests && npm test -- security` (API running + `db:seed` done).

| # | Weakness | Attack | Fix in the code | Status |
|---|----------|--------|-----------------|--------|
| 1 | IDOR | Organizer B edits / deletes organizer A's activity or mission; a volunteer cancels another volunteer's registration | Every query filters by `id` AND owner (`organizer_id = $2`, `user_id = $2`) → 404 | Built in from the start |
| 2 | Mass assignment | `POST` with `"role":"admin"`, `"organizer_id":1`, `"status":"cancelled"` | The role is checked (`organizer`/`volunteer` only), identity comes from `req.userId` (token), fields are read one by one | Built in from the start |
| 3 | Injection | `?location=' OR '1'='1`, email `{ "$ne": "x" }`, id `1;DROP TABLE users` | Parameterized queries (`$1`), TYPE checks (`typeof x === 'string'`), ids converted with `Number()` | Built in from the start |
| 4 | XSS | Title `<img src=x onerror=alert(1)>` | React renders text only; no `dangerouslySetInnerHTML`; emails use `esc()`; helmet (CSP) | Built in from the start |
| 5 | Brute force | 20 wrong logins in a row | `loginLimiter`: 5 failures / 15 min → **429** | **Added** |
| 6 | Body size | 5 MB body on `/signup` | `express.json({ limit: '10kb' })` → **413** | **Added** |
| 7 | Flooding | 1000 requests/min | `apiLimiter`: 300 / 15 min → 429 | **Added** |
| 8 | Headers | `curl -I` on the API | `helmet()` (CSP, HSTS, nosniff), `X-Powered-By` removed | Built in from the start |
| 9 | Secrets | `git log -p \| grep SECRET` | `.env` in `.gitignore` (root + server + client), `.env.example`, startup crash if a secret is missing, `NODE_ENV=production` requires `CLIENT_ORIGIN` | Built in / completed |
| 10 | Demo routes | `GET /api/demo/organizer` | Demo routes **removed** from the API | **Fixed** |
| 11 | JWT | Forged token with `alg: none` | `jwt.verify(..., { algorithms: ['HS256'] })` | **Added** |

## Before / after for the weaknesses added in this session

For weaknesses 5, 6, 10 and 11, the "before" state is the code of the original `server.js`:
no limiter, `express.json()` without a size limit, `/api/demo/*` routes, and `jwt.verify` without an algorithm list.
These weaknesses were identified by reading that code; the old version was not run against the attacks.

### Weakness 5 — brute force
- Attack: `for i in $(seq 1 20); do curl -s -o /dev/null -w "%{http_code}\n" -X POST localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{"email":"a@b.co","password":"wrongpass1"}'; done`
- Before: no limiter in the code, so failed logins were never blocked (no 429).
- After: 5 failures return `401`, then the limiter returns `429`.

### Weakness 6 — oversized body
- Attack: `curl -X POST localhost:3000/api/auth/signup -H "Content-Type: application/json" -d "{\"name\":\"$(head -c 20000 /dev/zero | tr '\0' x)\"}"`
- Before: `express.json()` had no size limit.
- After: `413` (limit of 10 kB).

### Weakness 10 — demo routes
- Attack: `curl -i localhost:3000/api/demo/organizer -H "Authorization: Bearer <token>"`
- Before: the demo routes existed in the API.
- After: `404`, the routes no longer exist.

## Known limitation

The token is stored in `localStorage`: an XSS vulnerability could read it. This is accepted for the scope of the course;
in a production application, a cookie with `httpOnly; secure; sameSite=lax` would be used instead.

## Manual verification — 18 November 2026

Target: local API at http://localhost:3000.
These requests did not modify application data.

### 1. Authentication: protected route without a token

Request:

```powershell
curl.exe -i http://localhost:3000/api/organizer/activities
```

Observed response:

```text
HTTP/1.1 401 Unauthorized
```

Result: access without a token was rejected.

### 2. Input validation: missing login credentials

Request:

```powershell
curl.exe -i -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" --data-raw "{}"
```

Observed response:

```text
HTTP/1.1 400 Bad Request
```

```json
{"error":"Email and password are required"}
```

Result: missing credentials were rejected with a JSON error.

### 3. Security response headers

Request:

```powershell
curl.exe -I http://localhost:3000/api/health
```

Observed response: HTTP 200 OK, with these headers:

- Content-Security-Policy
- Strict-Transport-Security
- X-Content-Type-Options: nosniff
- X-Frame-Options: SAMEORIGIN

The X-Powered-By header was absent.

Result: the API returned the expected security headers.
Their presence alone does not prove complete application security.

### 4. Deployed API

On the deployed API (`https://volunteer-organizer-api.onrender.com`), opening `/api/activities` without a token returns `{"error":"Missing token"}`: protected routes reject unauthenticated requests in production as well.
The deployed API only accepts requests from the configured website origin (`CLIENT_ORIGIN`).

### Scope of this verification

These are observations of the current protected version.
No vulnerable previous version was executed, so these results are not a measured before/after security comparison.
