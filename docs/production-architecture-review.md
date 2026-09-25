# LOOP Production Architecture Review

## Review status

**Decision: Proceed with a staged production hardening program.** The current
application is a functional MVP, not yet a production SaaS platform. The
existing behavior should be preserved while the data model, asynchronous AI
processing, authorization, auditability, and operational controls are added
behind compatible API contracts.

## 1. Product requirement validation

### Confirmed product value

LOOP ingests unstructured customer feedback, turns it into classified and
searchable signals, then helps teams prioritize action through dashboards,
trends, grounded questions, and Voice-of-Customer reports. The primary value
loop is:

1. Capture feedback.
2. Classify and associate themes.
3. Review and action the item.
4. Detect changes in volume/sentiment.
5. Ask grounded questions and generate evidence-backed reports.

### Decisions required before implementation

| Decision | Recommended production decision |
|---|---|
| Workspace membership | A user may belong to multiple workspaces through `WorkspaceMember`; role is membership-scoped. |
| Feedback deletion | Soft-delete by default; hard delete is a controlled admin/data-retention operation. |
| AI execution | Queue-backed jobs with idempotency keys and retry/dead-letter states; do not block ingestion on Claude. |
| Embeddings | Neon PostgreSQL with pgvector in production; portable JSON vectors only for local/demo mode. |
| Tenant enforcement | Central authorization context plus repository methods that require `workspaceId`; add database-level RLS where operationally supported. |
| Search | PostgreSQL full-text search for lexical search plus pgvector similarity for RAG. |
| Reports/PDF | Persist report version/status and export metadata; generate PDFs asynchronously and store in object storage. |
| Notifications | In-app notifications first; email delivery is an opt-in provider integration with an outbox. |
| Analytics | Pre-aggregated daily facts for scale, with exact query fallback for small workspaces. |

### Current implementation comparison

**Keep:** Next.js 14 App Router, TypeScript, Tailwind, Prisma, PostgreSQL,
Auth.js credentials, bcrypt, Zod, Recharts, Claude module boundary, current
tenant-scoped MVP pages, and seed/demo workflow.

**Refactor:** `User.workspaceId` into membership, synchronous AI classification
into a job boundary, JSON embeddings into pgvector, arbitrary status updates
into a state machine service, raw route-handler Prisma access into repositories,
and broad error mapping into typed domain errors.

**Add:** audit log, notification, question history, import/job/report-export
models, workspace settings, profile settings, theme management, date/sort
filters, soft deletion, rate limits, idempotency, structured logging, metrics,
tracing, retention, and OpenAPI contracts.

## 2. User story and acceptance-criteria review

| Epic | User story | Acceptance criteria | Main edge cases |
|---|---|---|---|
| Auth | As a person, I can create an account and workspace. | Password meets policy, is bcrypt/Argon2 hashed, email is normalized and unique, workspace and ADMIN membership are created atomically, duplicate email returns 409. | Race on duplicate email, invitation expiry, email case differences, transaction rollback. |
| Auth | As a user, I can log in and log out securely. | JWT session contains user and active workspace, protected routes reject unauthenticated requests, logout invalidates the client session. | Disabled user, changed role, stale token, brute force, concurrent sessions. |
| Workspaces | As a user, I can switch between authorized workspaces. | Every request resolves an active membership; changing workspace cannot expose another tenant. | Removed membership, stale active workspace, direct ID tampering. |
| Team | As an ADMIN, I can invite and manage members. | Invite is single-use, hashed/tokenized, expires, role is validated, role changes are audited, ADMIN cannot remove the final admin. | Re-invite, duplicate pending invite, self-demotion, disabled member. |
| Feedback | As an ANALYST, I can create and edit feedback. | Zod validation, tenant-scoped write, audit event, AI job enqueued, optimistic UI reconciles with server. | Empty/oversized content, duplicate source event, AI outage, concurrent edit. |
| Feedback | As a manager, I can move feedback through the workflow. | Only `NEW→REVIEWED→ACTIONED`, transitions are server-enforced and audited. | Repeated click, invalid jump, deleted item, stale UI. |
| Import | As an ANALYST, I can upload CSV and see an import summary. | Header and row validation, bounded file/row size, per-row errors, idempotent source key, import status persisted. | Malformed encoding, duplicate rows, partial failure, huge file, formula injection in exports. |
| Inbox | As a team member, I can find and triage feedback. | Search, theme/status/sentiment/channel/date filters, deterministic sort, cursor or bounded offset pagination, tenant scope. | Empty page after deletion, invalid cursor, timezone boundary, slow count. |
| Dashboard | As a user, I can understand current customer health. | KPI definitions are documented, chart queries are tenant-scoped, dates use workspace timezone, empty states are explicit. | No data, late-arriving events, large workspace, denominator zero. |
| Themes | As an ADMIN, I can manage canonical themes. | Create/rename/archive, duplicate names blocked per workspace, merges preserve links and audit history. | Theme merge race, archived theme on new feedback, orphaned associations. |
| AI | As the system, feedback is classified once and can be retried. | Job idempotency, validated output, confidence and rationale stored, retry/backoff, failed status visible. | Claude timeout, malformed JSON, prompt injection, provider quota, duplicate worker. |
| Trends | As a user, I can see emerging themes. | Current and previous periods are explicit, zero denominators handled, minimum sample threshold shown. | First week, timezone, sparse data, theme rename. |
| Ask LOOP | As a user, I can ask a grounded question. | Retrieval occurs before generation, sources/citations are returned, low evidence returns a refusal, history is stored, scope is enforced. | No embeddings, prompt injection in feedback, stale index, provider outage, context overflow. |
| Reports | As an ADMIN/ANALYST, I can create and export a VoC report. | Report sections and period are stored, source snapshot/version is reproducible, generation is audited, PDF status is visible. | Empty period, report retry, changed feedback after generation, PDF failure. |
| Notifications | As a user, I receive relevant system notifications. | Events are idempotent, unread state is per user, links are tenant-safe, delivery failures are retryable. | Duplicate event, disabled user, email bounce. |
| Audit | As an auditor, I can reconstruct sensitive changes. | Actor, workspace, entity, action, old/new values, request ID, IP/user-agent policy, timestamp are retained. | Secrets in payloads, large JSON, retention purge, failed transaction. |

## 3. Security review

### High-priority findings to fix

1. Current membership is modeled as one workspace per user. This prevents
   safe multi-workspace operation and makes role switching a special-case.
2. JWT claims can become stale after role/member disablement. Server-side
   membership lookup must remain authoritative and disabled users must be
   rejected.
3. Signup password validation currently checks length but not uppercase,
   lowercase, number, and special-character requirements.
4. Feedback delete, edit, theme administration, audit log, notification, and
   report export authorization surfaces are incomplete.
5. AI calls are synchronous and can hold an HTTP request open; use a job queue,
   request deadlines, retries, quotas, and idempotency.
6. Ask LOOP must treat feedback as untrusted prompt content and delimit it
   strongly; citations must be generated from retrieved IDs, not trusted model
   text.
7. Rate limiting is required for login, signup, invitations, imports, AI
   questions, reports, and simulator endpoints.
8. Audit payloads must redact passwords, tokens, API keys, embeddings, and
   unnecessary personal data.
9. CSV and PDF export paths need content-disposition, size, authorization, and
   spreadsheet/formula-injection controls.
10. Errors need correlation IDs and structured server logs; clients must not
    receive provider or database internals.

### Required controls

HTTPS-only deployment, secure/httpOnly/sameSite cookies, CSRF protection for
mutating browser requests, origin checks, CSP/security headers, input/output
validation, request body limits, IP/user/workspace rate limits, secret
management, dependency scanning, SAST, DAST, backup/restore tests, incident
runbooks, and least-privilege database credentials.

## 4. Target architecture

### Frontend

Next.js App Router with server-rendered protected pages, client components only
for interactive forms/tables, React Hook Form + Zod for complex forms,
TanStack Table for inbox, a small Redux Toolkit slice only for cross-page UI
state (active workspace, notification count, filters where URL state is not
appropriate), and Recharts for analytics. URL query parameters are the source
of truth for shareable inbox filters and pagination.

### Backend

Route handlers are thin adapters. They authenticate, validate, authorize,
create a request context, and call application services. Services call
repositories, not Prisma directly. Domain events are written transactionally
to an outbox; workers process classification, embedding, report, PDF, and
notification jobs. Every repository method requires a workspace context.

### Data

PostgreSQL/Neon with pgvector, composite indexes beginning with
`workspaceId`, soft-delete columns, immutable audit records, and daily
analytics facts. Use Prisma for relational access and a controlled SQL
migration for pgvector/RLS/FTS where Prisma cannot express the feature.

### AI

`ClassificationJob`, `EmbeddingJob`, `ReportJob`, and `Question` services share
provider adapters, Zod schemas, prompt versioning, token budgets, timeouts,
retries, and redaction. Store model/provider/prompt version and latency for
reproducibility. Never allow model output to bypass authorization.

### Deployment

Vercel hosts the Next.js web/API layer. Neon hosts PostgreSQL/pgvector.
Background workers run on a queue-capable service or Vercel-compatible job
runner. Object storage holds generated PDFs. Sentry/OpenTelemetry-compatible
tracing and structured logs provide observability. CI runs typecheck, lint,
unit/integration tests, migration validation, build, dependency scan, and
Playwright smoke tests.

## 5. API design

All responses use `{ data, error, meta }`; errors have `code`, `message`,
`requestId`, and optional field errors. Mutations accept an
`Idempotency-Key`. All endpoints resolve an active workspace membership.

### Core endpoints

| Method | Path | Permission | Purpose |
|---|---|---|---|
| POST | `/api/auth/signup` | Public | Create account/workspace or accept invite. |
| POST | `/api/auth/login` | Public | Auth.js credentials sign-in. |
| POST | `/api/auth/logout` | Authenticated | End session. |
| GET/PATCH | `/api/workspaces/current` | Member/ADMIN | Read/update workspace settings. |
| GET/POST | `/api/workspaces/:id/members` | Member/ADMIN | List/invite members. |
| PATCH/DELETE | `/api/workspaces/:id/members/:memberId` | ADMIN | Role/disable/remove member. |
| GET/POST | `/api/feedback` | Member/ADMIN+ANALYST write | Search/create feedback. |
| GET/PATCH/DELETE | `/api/feedback/:id` | Member/role-based | Read/edit/soft-delete feedback. |
| POST | `/api/feedback/imports` | ADMIN/ANALYST | Start CSV import. |
| GET | `/api/feedback/imports/:id` | Member | Import progress/errors. |
| POST | `/api/feedback/simulations` | ADMIN/ANALYST | Start simulated source ingestion. |
| GET/POST/PATCH | `/api/themes` | Member/ADMIN write | List/create/update/archive themes. |
| GET | `/api/dashboard` | Member | KPI and chart data. |
| GET | `/api/trends` | Member | Period comparison and emerging themes. |
| POST/GET | `/api/questions` | Member | Ask grounded question/list history. |
| GET/POST | `/api/reports` | Member/ADMIN+ANALYST write | List/start report generation. |
| POST/GET | `/api/reports/:id/exports` | Member | Start/get PDF export. |
| GET | `/api/audit-logs` | ADMIN | Filter audit events. |
| GET/PATCH | `/api/notifications` | Member | List/mark read. |

## 6. AI, RAG, analytics, and report logic

### Classification

Ingestion creates feedback and an idempotent analysis job in one transaction.
The worker loads only the workspace's active themes, calls the provider with a
versioned schema-constrained prompt, validates output, upserts associations,
creates/updates the embedding, and records attempts/latency. A failure leaves
the feedback visible with `PENDING`/`FAILED` status and a retry action.

### RAG

Normalize question → embed question → vector search within workspace and
non-deleted feedback → optional lexical rerank → minimum score/coverage check →
bounded context with immutable source IDs → Claude answer constrained to context
→ validate citations against retrieved IDs → store `QuestionHistory`. A
low-evidence response is a refusal, never a generated guess.

### Trends

For workspace-local timezone, calculate current 7/30 days and immediately
preceding equal period. For each active theme:

`changePercent = ((current - previous) / max(previous, 1)) * 100`

Expose counts, sentiment mix, minimum sample size, and a `RISING`, `FALLING`,
or `STABLE` label. Do not call a theme “spiking” below a configurable minimum
count.

### Reports

Freeze a report source snapshot (feedback IDs, period, prompt/model versions),
compute deterministic aggregates, generate a grounded narrative, validate
sections, persist versions, then enqueue PDF rendering. Supporting quotes must
reference stored feedback IDs.

## 7. Testing and quality strategy

### Unit

Test password policy, state transitions, filter parsing, pagination boundaries,
trend math, sentiment percentages, theme merge rules, citation validation,
prompt/output schemas, CSV row validation, and permission predicates.

### Integration/API

Test every endpoint with authenticated/unauthenticated users, all roles,
different workspaces, invalid Zod payloads, duplicate idempotency keys,
soft-deleted records, provider failures, import partial failures, and audit
event creation.

### E2E

Signup → workspace creation → login → invite → accept invite → role change;
feedback create/edit/classify/review/action; CSV import; filters/sort/pagination;
dashboard/trends; Ask LOOP citations/refusal; report generation/PDF; notifications.

### Security

Cross-tenant ID substitution, IDOR, stale JWT after disable/role change, brute
force/rate limits, CSRF/origin, XSS in feedback, CSV formula injection, prompt
injection, secret leakage, path traversal, and export authorization.

### Performance/UAT

Define p95 targets: authenticated read APIs <300ms at 10k feedback/workspace,
interactive mutation acknowledgement <500ms before async work, question API
acknowledgement <2s, and background job completion SLOs. Load test realistic
tenant skew (one large tenant plus many small tenants), then conduct UAT with
Admin, Analyst, and Viewer scripts using seeded acceptance data.

## 8. Production checklist and risks

Before launch: migrations rehearsed and reversible, backups restored in a
drill, RLS/tenant tests green, secrets configured, rate limits enabled, Sentry
and alerts active, queue retries verified, PDF storage private, demo data
separated from production, accessibility smoke test complete, privacy/retention
policy approved, and rollback runbook tested.

Primary risks are AI cost/latency, tenant data leakage, asynchronous job
duplication, unbounded analytics queries, stale authorization claims, and
provider outages. Mitigations are quotas, caching, idempotency, composite
indexes/materialized facts, authoritative membership checks, and graceful
degraded modes.
