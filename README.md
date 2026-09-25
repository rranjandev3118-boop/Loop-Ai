# LOOP — AI Customer-Feedback Intelligence Platform

A corporate-grade internship implementation of Project LOOP.

## Project LOOP

LOOP is a multi-tenant customer-feedback intelligence platform. Teams can
ingest support tickets, app reviews, survey responses, sales notes, and
community posts, then classify, search, cluster, and summarize the feedback
with Claude.

## Acceptance-criteria coverage

### C1 Authentication & workspaces
- Sign-up creates a workspace and ADMIN user.
- Passwords are bcrypt-hashed.
- Auth.js sessions persist.
- Protected app routes require an authenticated session.
- Tenant-owned queries use `workspaceId`.

### C2 RBAC
- ADMIN, ANALYST and VIEWER roles.
- Server-side role guards return 403 for forbidden API operations.
- Admin workspace member view is included.
- Analysts are the intended ingestion/triage role; viewers are read-only.

### C3 Feedback ingestion
- Validated single-entry API.
- Schema supports CSV fields: content, channel, customerLabel, createdAt.
- Seeded simulated channels represent Support ticket, App store, NPS survey, Sales call note and Community post.
- Feedback is classified on ingestion through the dedicated `lib/ai/` module.
- CSV imports accept `content`, `channel`, `customerLabel`, and optional
  `createdAt` columns (maximum 1,000 rows / 5 MB).
- Analysts and admins can generate simulated support tickets from the inbox.

### C4 Feedback inbox
- Inbox is workspace-scoped.
- Server-side offset pagination supports search, channel, sentiment, theme, and status filters.
- Status model: NEW → REVIEWED → ACTIONED.
- Theme/sentiment/channel data is persisted for filtering.

### C5 Analytics
- Dashboard stat cards: total items, % negative, new this week.
- Theme counts are computed from real database relations.
- Dashboard charts use Recharts for volume-over-time, sentiment breakdown, and top-theme charts.

### AI1 Auto-classification
- Feedback model stores sentiment, sentiment score, themes, feature area and rationale.
- Claude prompts and response parsing are centralized in `lib/ai/`; responses are Zod-validated.
- Manual re-classification endpoint can be added using the same service boundary.

### AI2 Theme clustering & trends
- Theme + FeedbackTheme models support named themes, confidence and drill-down.
- Trends page shows real theme volumes; period-over-period spike calculation can be added to the same query service.

### AI3 Ask LOOP
- `/api/insights/ask` retrieves workspace feedback before generating an answer.
- Workspace-scoped retrieval runs before Claude; Claude is instructed to answer only from retrieved context and cite item numbers.
- If no Claude key exists, demo grounding mode exposes the actual retrieved records rather than inventing content.

### AI4 VoC report
- Report model persists period, author and JSON report content.
- Seed includes a saved example report.
- Weekly and monthly reports precompute statistics and use Claude for a grounded narrative when an API key is configured.

## Stack
Next.js 14 App Router, TypeScript, Tailwind CSS, PostgreSQL, Prisma, Auth.js,
Claude API, Recharts, Papa Parse, and Zod.

## Local setup
1. Node.js 18+ and PostgreSQL.
2. Copy `.env.example` to `.env`.
3. Set `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `RESEND_API_KEY`,
   and `RESEND_FROM_EMAIL`. `ANTHROPIC_API_KEY` / `ANTHROPIC_MODEL` are
   optional. Never commit `.env` files.
4. Run:
   - `npm install` (this automatically runs `prisma generate`)
   - `npx prisma generate` (also run this after changing `prisma/schema.prisma`)
   - `npx prisma migrate dev --name init`
   - `npm run seed`
   - `npm run dev`

New workspace signups verify the email address with a single-use, 10-minute
Resend OTP before the workspace and admin account are created. Invited members
use the same verification step and receive their role from the stored
invitation; roles are never accepted from the browser.

Login OTPs are required for non-demo users after password verification. OTPs
expire after 10 minutes, allow five attempts, enforce a 60-second resend
cooldown, and allow at most five sends per hour per email. In development,
missing Resend variables log the OTP in the server terminal; production
requires a configured Resend sender.

To configure Resend, create an API key, verify a sending domain in the Resend
dashboard, and set `RESEND_FROM_EMAIL` to an address on that domain. Resend
testing mode only permits delivery to the account owner's email.
Workspace invitations are also delivered through Resend to the email entered
by the administrator. The invitation contains a single-use signup link that
expires after 7 days; the link is not copied to the clipboard or exposed in
the browser response.

Resend accounts remain in testing mode until a sending domain is verified. In
that mode, Resend only delivers to the account owner's email address. Verify a
domain in the Resend dashboard and set `RESEND_FROM_EMAIL` to an address on
that domain before enabling signups for arbitrary users.

### CSV format

```csv
content,channel,customerLabel,createdAt
"Onboarding invitations arrive late","Support ticket","Acme","2026-09-18T09:00:00.000Z"
```

### Verification

- `npm test` runs the lightweight Node test runner through `tsx`, covering
  validation, API payload contracts, tenant scoping, RBAC, CSV import limits,
  and AI fallback/grounding behavior.
- `npm run verify:tenant-isolation` creates two temporary workspaces, checks a
  tenant-scoped query, and removes only its own test records.
- `npm run build` runs Prisma generation, TypeScript validation, and the
  production Next.js build.
- `npm test` runs the unit/API contract, RBAC, tenant-scope, CSV, and AI
  grounding tests.
- `GET /api/health` verifies the application/database readiness.

## Deployment

Deploy the repository as a Next.js project on Vercel. Set the same environment
variables from `.env.example` in the Vercel project settings, including
`CRON_SECRET`, use the default build command (`npm run build`), and run
`npx prisma migrate deploy` followed by `npm run seed` once against the
production database before sharing demo credentials. `vercel.json` schedules a
protected job endpoint every minute to retry queued AI classification work.
Report PDF exports are generated server-side and are returned with private,
non-cacheable download headers; configure private object storage before
retaining exported files beyond the request.

## If you see “@prisma/client did not initialize yet”

Stop the dev server, then run:

```bash
npx prisma generate
npm run dev
```

The project runs `prisma generate` automatically after `npm install` and before `build`. It is intentionally not run automatically before `dev`, because Windows can lock the Prisma query-engine DLL while a previous Next.js process is still running. If the Prisma client is out of date, stop the dev server, run `npx prisma generate`, and restart `npm run dev`.

## Demo credentials
All three seeded accounts use password `LoopDemo123!`:
- Admin: admin@loop.demo
- Analyst: analyst@loop.demo
- Viewer: viewer@loop.demo

Demo accounts are pre-verified and do not require OTP.

Do not reuse the demo password elsewhere.

## Security
Never commit `.env`, API keys, database credentials, or `node_modules`. All tenant data must be queried with the authenticated user's workspace ID.
