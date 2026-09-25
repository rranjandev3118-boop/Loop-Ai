# LOOP Delivery Plan

## Migration strategy

1. Add additive tables/enums and `deletedAt` columns; deploy code that can
   read both old and new shapes.
2. Backfill one `WorkspaceMember` for every current `User.workspaceId`.
3. Normalize invitation tokens into hashes and backfill `slug`.
4. Backfill `sourceType=MANUAL`, classification statuses, confidence values,
   and report statuses.
5. Create pgvector extension, convert embeddings in a maintenance window, and
   add the HNSW index after data backfill.
6. Deploy repository/service authorization and dual-read membership logic.
7. Switch writes to memberships, remove legacy workspace columns only after a
   verified rollback window.
8. Enable RLS policies after application queries are proven tenant-safe.
9. Run isolation, rollback, backup-restore, and performance checks before
   production cutover.

The migration must be forward-compatible, independently deployable, and
reversible until the legacy columns are removed. Never perform a destructive
drop in the same release as a backfill.

## Seed strategy

Use a deterministic `SEED_VERSION` and upserts scoped by workspace slug. Seed
one demo workspace, three users, ten themes, at least 120 feedback records
distributed across channels/status/sentiment and multiple dates, completed
reports, embeddings, and question history. Passwords are demo-only and must be
unique to non-production environments. Production deployment must start with
empty tenant data or an explicitly isolated demo tenant.

## Epics and GitHub issues

### E1 Foundation and security

- **LOOP-101** Add WorkspaceMember model and backfill current memberships.
  - AC: all protected requests resolve active membership; cross-tenant IDs
    return 403/404 without data leakage.
  - Depends on: none.
- **LOOP-102** Implement password policy, account lock/rate limit, and
  disabled-user checks.
  - AC: all policy rules are validated server-side; stale sessions cannot
    access APIs after disablement.
- **LOOP-103** Create authorization context/repository boundaries.
  - AC: no application repository method can run without workspace context.
- **LOOP-104** Add structured errors, request IDs, secure headers, and audit
  redaction.

### E2 Feedback, imports, and inbox

- **LOOP-201** Add soft-delete, edit/delete APIs, audit events, and status
  state machine.
- **LOOP-202** Add ImportBatch/ImportRow, bounded streaming CSV validation,
  idempotency, and progress UI.
- **LOOP-203** Add deterministic sorting, date filters, cursor pagination, and
  empty-page recovery.
- **LOOP-204** Add theme CRUD/archive/merge with ADMIN authorization.

### E3 AI platform

- **LOOP-301** Add AnalysisJob/outbox worker boundary and retry/dead-letter
  behavior.
- **LOOP-302** Enable pgvector/OpenAI embedding adapter and migration.
- **LOOP-303** Persist QuestionHistory and validate citations/refusal behavior.
- **LOOP-304** Add prompt versions, token/cost telemetry, quotas, and AI
  failure/retry controls.

### E4 Analytics and reports

- **LOOP-401** Add documented KPI/trend contracts with timezone-aware periods.
- **LOOP-402** Add report source snapshots, versions, and report lifecycle.
- **LOOP-403** Add asynchronous PDF export and private object-storage links.
- **LOOP-404** Add notifications and notification preferences.

### E5 Operations and release

- **LOOP-501** Add unit, integration, isolation, RBAC, and security suites.
- **LOOP-502** Add Playwright role-based critical-path tests.
- **LOOP-503** Add CI migrations/typecheck/lint/test/build/dependency scan.
- **LOOP-504** Add metrics, tracing, alerts, backup/restore drill, and
  production runbooks.
- **LOOP-505** Update README, OpenAPI, environment documentation, and seeded
  demo credentials.

## Sprint plan

### Sprint 1: Tenant and security foundation

LOOP-101, LOOP-102, LOOP-103, LOOP-104. Exit: isolation and RBAC tests pass,
all protected APIs use the new request context.

### Sprint 2: Feedback lifecycle

LOOP-201, LOOP-202, LOOP-203. Exit: create/edit/delete/import/search/filter/
pagination flows pass for all roles and audit records are present.

### Sprint 3: Themes and async AI

LOOP-204, LOOP-301, LOOP-302, LOOP-304. Exit: ingestion is responsive while
workers classify/retry and vector retrieval is tenant-scoped.

### Sprint 4: Ask LOOP, trends, and reports

LOOP-303, LOOP-401, LOOP-402, LOOP-403. Exit: grounded answers cite valid
feedback IDs, refusal works, and PDFs are private and reproducible.

### Sprint 5: Release readiness

LOOP-404, LOOP-501 through LOOP-505. Exit: CI green, UAT signed off,
observability/rollback/backup drills complete, and deployment checklist approved.

## Acceptance test matrix

| Test | Expected result |
|---|---|
| User A requests feedback ID belonging to workspace B | 403 or indistinguishable 404; no body leakage. |
| Viewer posts feedback/status/theme/member mutation | 403; no write occurs. |
| Analyst uploads invalid CSV row | Import remains usable; row error is persisted and summarized. |
| Same idempotency key is submitted twice | One mutation/job; same safe response. |
| Claude returns malformed JSON | Job is retryable/failed; feedback remains visible and no unsafe values persist. |
| Ask LOOP has no matching evidence | Grounded refusal with empty citations. |
| Feedback changes after report generation | Existing report remains reproducible from its source snapshot. |
| Last admin attempts self-removal/demotion | 409; membership remains active. |
| Deleted feedback appears in search/RAG | It does not appear by default. |
| User is disabled with an existing JWT | Next protected request is rejected. |

## Production launch checklist

- [ ] Production database migration rehearsed and rollback documented.
- [ ] Tenant isolation and RBAC suites pass against a real PostgreSQL instance.
- [ ] pgvector index and query plan verified at expected data volume.
- [ ] Queue retries, dead-letter handling, and duplicate worker behavior tested.
- [ ] AI provider timeouts, quotas, redaction, and prompt-injection tests pass.
- [ ] Private PDF storage and signed-download authorization verified.
- [ ] Rate limits, security headers, CSRF/origin checks, and secret rotation set.
- [ ] Sentry/logging/metrics dashboards and alerts tested.
- [ ] Backup restore and disaster-recovery exercise completed.
- [ ] UAT complete for ADMIN, ANALYST, and VIEWER.
- [ ] README/OpenAPI/env vars/runbooks updated.
- [ ] Vercel, database, queue, object storage, and domain configuration verified.

## Technical debt register

| Debt | Impact | Retirement plan |
|---|---|---|
| Direct Prisma access in route handlers | Inconsistent authorization/query behavior | Move to repositories during E1/E2. |
| JSON embeddings | Slow and memory-heavy retrieval | pgvector migration in E3. |
| Synchronous AI calls | Slow requests and duplicate work | Job/outbox worker in E3. |
| Offset pagination for deep pages | Degrades on large tenants | Cursor pagination with stable sort in E2. |
| JWT-only role claims | Stale authorization risk | Authoritative membership lookup in E1. |
| Demo fallback classifier | Can mask provider outage | Label as demo mode and surface failed AI status. |
