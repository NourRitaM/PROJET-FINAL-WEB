# Performance and Lighthouse Report — Session 22

## Audit setup

- Date: 18 November 2026
- Page tested: public homepage, logged out
- URL: http://localhost:4173/
- Build: Vite production build
- Lighthouse mode: Navigation
- Device: Mobile

Commands executed from the `client` folder:

```bash
npm run build
npm run preview
```

The production preview was audited instead of the development server.

## Lighthouse results

| Category | Initial audit | After SEO changes | After favicon correction |
|---|---:|---:|---:|
| Performance | 94 | 94 | 94 |
| Accessibility | 100 | 100 | 100 |
| Best Practices | 96 | 96 | 100 |
| SEO | 83 | 100 | 100 |

The SEO and Best Practices scores improved.
The measured Performance score remained unchanged.

Lighthouse scores are estimates and can vary between runs.
An Accessibility score of 100 covers automated checks only;
it does not replace manual accessibility testing.

## Initial performance metrics

| Metric | Initial measurement |
|---|---:|
| First Contentful Paint | 1.7 s |
| Largest Contentful Paint | 2.8 s |
| Total Blocking Time | 0 ms |
| Cumulative Layout Shift | 0.001 |
| Speed Index | 3.1 s |

These values belong to the initial report.
Final metric values must be read from the corresponding final report;
they are not assumed to be identical.

## Changes made after the initial audit

### 1. Added a meta description

File: `client/index.html`

Lighthouse reported that the document did not have a meta description.
A description explaining the application's purpose was added.

### 2. Added a valid robots.txt file

File: `client/public/robots.txt`

Lighthouse reported an invalid robots.txt response.
A plain-text file was added with:

```text
User-agent: *
Allow: /
```

After these two changes, the SEO score increased from 83 to 100.

### 3. Added the website favicon

Files:

- `client/public/community-logo.jpg`
- `client/index.html`

Lighthouse recorded a 404 error for `/favicon.ico`.
An explicit favicon link referencing the existing logo was added.

After rebuilding and repeating the audit,
the Best Practices score increased from 96 to 100.

These changes did not modify backend files or application workflows.

## Existing performance measures

### Route-level code splitting

`client/src/App.jsx` uses `React.lazy` and `Suspense`
for five authenticated pages:

- OrganizerPage
- ActivitiesPage
- ActivityDetailsPage
- ProfilePage
- MyRegistrationsPage

The production build generates separate JavaScript chunks for these pages.

No comparable build from before code splitting was measured,
so no before/after bundle-size reduction is claimed.

### Database indexes

`server/db/schema.sql` defines indexes for:

- `activities(organizer_id)`
- `activities(status, date)`
- `missions(activity_id)`
- `registrations(user_id)`

These indexes were already present.
No database performance benchmark was performed during this audit,
and no measured database speed improvement is claimed.

## Remaining performance opportunity

Lighthouse identified render-blocking resources, including
the Google Fonts stylesheet.

The report estimated potential savings of 450 ms.
This is an estimate, not a measured improvement.

Font loading was not changed during this verification.
A separate performance optimization and a repeat audit are still needed
to demonstrate a loading-performance improvement.

## Validation

- Frontend: 44 tests passed across 12 test files.
- Production build: successful.
- Final Lighthouse scores: 94 / 100 / 100 / 100.