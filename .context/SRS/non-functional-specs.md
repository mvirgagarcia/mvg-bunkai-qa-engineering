# SRS — Non-Functional Specifications

> Product: Bunkai TMS
> Phase: 2 — Architecture
> Generated: 2026-05-31
> Policy: Every numerical claim requires evidence path or is flagged as a Discovery Gap. "Not implemented — recommend adding" is the correct rating when no evidence exists.

---

## NFR Summary

| Category | Status | Maturity |
|----------|--------|---------|
| Performance | Partial | Structural optimizations present; no load test data; rate limits absent |
| Security | Partial | Auth + RLS + secret isolation implemented; HTTP headers absent |
| Reliability | Partial | Error boundaries present; no retry logic; health endpoint exists |
| Scalability | Good | Stateless design; serverless deployment; no async queues yet |
| Observability | Minimal | Structured JSON logging to stdout; no APM, metrics, or alerting |

---

## 1. Performance

### NFR-PERF-001: GIN Full-Text Search on ATCs

| Aspect | Value |
|--------|-------|
| **Target** | [Unknown] — no benchmarks in codebase; GIN index structure implies sub-second query at typical TMS scale |
| **Implementation** | `atcs.tsv` tsvector column with `atcs_tsv_gin_idx` GIN index; updated via DB trigger on insert/update |
| **Evidence** | `supabase/migrations/0004_atcs.sql` — `atcs_tsv_gin_idx`, tsv trigger definition |

GIN (Generalized Inverted Index) is the correct index type for full-text tsvector queries. Performance degrades on very large datasets (millions of ATCs) without query-plan tuning. No load tests found.

### NFR-PERF-002: Static OpenAPI Spec Caching

| Aspect | Value |
|--------|-------|
| **Target** | 5-minute cache (`max-age=300, s-maxage=300`) |
| **Implementation** | `GET /api/openapi` reads `public/openapi.json` at module load, returns with `Cache-Control: public, max-age=300` |
| **Evidence** | `app/api/openapi/route.ts:14,22` — `force-static` + explicit headers |

### NFR-PERF-003: React Server Component Data Fetching

| Aspect | Value |
|--------|-------|
| **Target** | [Unknown] — no SLA defined |
| **Implementation** | All project/module/ATC/story/AC data fetched in parallel via `Promise.all` in Server Components — no client waterfalls |
| **Evidence** | `app/(app)/projects/[projectSlug]/page.tsx:50–61` — parallel Supabase queries; `app/(app)/projects/[projectSlug]/atcs/[atcId]/page.tsx:40–52` — same pattern |

### NFR-PERF-004: Monaco Editor Lazy Loading

| Aspect | Value |
|--------|-------|
| **Target** | Main bundle not impacted by Monaco (~5MB) |
| **Implementation** | `next/dynamic` with `ssr: false` — Monaco loaded only when ATC editor is opened |
| **Evidence** | `components/atcs/AtcEditor.tsx:16–26` — `dynamic(() => import('.../StepEditor'), { ssr: false })` |

### NFR-PERF-005: PAT Prefix Lookup Optimization

| Aspect | Value |
|--------|-------|
| **Target** | [Unknown] — index lookup before hash compare eliminates full table scan |
| **Implementation** | `access_tokens.token_prefix` indexed; Bearer middleware queries by prefix (max 5 candidates) before SHA-256 hash compare |
| **Evidence** | `supabase/migrations/0008_access_tokens.sql`, `lib/api/middleware/bearer.ts:64–68` |

### NFR-PERF-006: Rate Limiting — NOT IMPLEMENTED

| Aspect | Value |
|--------|-------|
| **Target** | [Unknown — no implementation] |
| **Implementation** | Not implemented. Comment in `app/api/v1/auth/magic-link/route.ts:44`: "Phase F adds a real rate-limit middleware in front; for now we map the upstream verbatim" |
| **Evidence** | `app/api/v1/auth/magic-link/route.ts:44–50` |

**Recommendation:** Implement rate limiting on `/api/v1/auth/magic-link` (spam/abuse vector) and `/api/v1/auth/signin` (brute-force vector). Suggested: Upstash Redis rate limiter or Vercel Edge Config.

---

## 2. Security

### NFR-SEC-001: Multi-Tenant Data Isolation via RLS

| Aspect | Value |
|--------|-------|
| **Target** | Zero cross-tenant data leakage |
| **Implementation** | Supabase Row-Level Security enabled on all tables. All SELECT/INSERT/UPDATE/DELETE policies verify membership via `bunkai_is_workspace_member` SECURITY DEFINER helpers. |
| **Evidence** | `supabase/migrations/0001–0012` — every table has `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` + explicit policies |

**RLS Helper Functions** (SECURITY DEFINER — avoids recursive RLS):

| Function | Purpose |
|----------|---------|
| `bunkai_is_workspace_member(ws_id)` | Returns true if `auth.uid()` has active membership |
| `bunkai_is_workspace_admin(ws_id)` | Returns true if role is `admin` or `owner` |
| `bunkai_is_workspace_owner(ws_id)` | Returns true if role is `owner` |
| `bunkai_can_write_workspace(ws_id)` | Returns true if role is `member`, `admin`, or `owner` |

Source: `project-config.md §Database`

### NFR-SEC-002: Secret Isolation (PAT, Invite, Magic-Link Hashes)

| Aspect | Value |
|--------|-------|
| **Target** | QA and analytics roles cannot read raw secret hashes |
| **Implementation** | Secrets split into sibling tables (`access_token_secrets`, `workspace_invite_secrets`, `magic_link_token_secrets`). QA DB roles (`qa_inspector_ro`, `qa_inspector_rw`) have `REVOKE` on these tables. |
| **Evidence** | `supabase/migrations/0011_split_token_secrets.sql` — explicit REVOKE statements |

### NFR-SEC-003: PAT Format and Entropy

| Aspect | Value |
|--------|-------|
| **Target** | ~256 bits of entropy; secret-scanning detectable prefix |
| **Implementation** | `bk_pat_<prefix>.<secret>` format. `TOKEN_FAMILY_PREFIX = 'bk_pat_'` is a public marker for GitHub/GitGuardian scanning. Secret = 32 random bytes (~256 bits) base64url encoded. |
| **Evidence** | `app/api/v1/tokens/route.ts:20–23`, `lib/api/middleware/bearer.ts:17–18` comment |

### NFR-SEC-004: Uniform Auth Failure Responses

| Aspect | Value |
|--------|-------|
| **Target** | Never leak which specific auth check failed |
| **Implementation** | All Bearer validation failures collapse to `ApiError('unauthorized', 'Invalid token.')` — no distinction between wrong hash, revoked, expired, or unknown prefix |
| **Evidence** | `lib/api/middleware/bearer.ts:12–14` comment; `signin` route: `"Invalid email or password."` (uniform 401) — `app/api/v1/auth/signin/route.ts:33` |

### NFR-SEC-005: Open-Redirect Prevention

| Aspect | Value |
|--------|-------|
| **Target** | `next` parameter cannot redirect to external domains |
| **Implementation** | `safeNext` validation in auth callback: `next.startsWith('/') && !next.startsWith('//')` — clamps to `/projects` on failure |
| **Evidence** | `app/auth/callback/route.ts:17–19` |

### NFR-SEC-006: Environment Variable Validation

| Aspect | Value |
|--------|-------|
| **Target** | Hard fail on startup if required env vars are missing or malformed |
| **Implementation** | `lib/env.ts` uses Zod schema on startup — throws with descriptive error listing all missing vars |
| **Evidence** | `lib/env.ts:34–49` — `EnvSchema.safeParse(...)` + throw on failure |

### NFR-SEC-007: HTTP Security Headers — NOT CONFIGURED

| Aspect | Value |
|--------|-------|
| **Target** | [Not implemented] |
| **Implementation** | `next.config.ts` has no `headers()` function. No CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy headers configured. |
| **Evidence** | `next.config.ts` — 13-line config with no headers key |

**Recommendation:** Add security headers via `next.config.ts` `headers()` function. Minimum: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`. CSP requires audit of inline scripts.

### NFR-SEC-008: Input Validation via Zod

| Aspect | Value |
|--------|-------|
| **Target** | All API request bodies validated before processing |
| **Implementation** | Every route handler validates via Zod schema. `withApiHandler` wraps ZodError → 422 with issues array in `details`. |
| **Evidence** | `lib/api/handler.ts:68–73` — `isZodError` check; per-route `BodySchema` definitions |

---

## 3. Reliability

### NFR-REL-001: Health Endpoint

| Aspect | Value |
|--------|-------|
| **Target** | Liveness probe available at all times |
| **Implementation** | `GET /api/v1/health` returns `{ok:true, service:'bunkai-tms', env:string, ts:string}` with `force-dynamic` |
| **Evidence** | `app/api/v1/health/route.ts:1–13` |

**Note:** This is a liveness probe only — it does not check Supabase connectivity or perform a DB ping. A readiness probe would require a DB query.

### NFR-REL-002: Centralized Error Handling

| Aspect | Value |
|--------|-------|
| **Target** | All API errors return consistent `{error:{code,message,details?,request_id?}}` envelope |
| **Implementation** | `withApiHandler` catches `ApiError` (→ envelope), `ZodError` (→ 422 with issues), and generic `Error` (→ 500) |
| **Evidence** | `lib/api/handler.ts:47–61`, `lib/api/error-envelope.ts:16–49` |

**API Error Codes:**

| Code | HTTP | Meaning |
|------|------|---------|
| `bad_request` | 400 | Malformed request |
| `validation_failed` | 422 | Zod schema failure |
| `unauthorized` | 401 | Missing or invalid auth |
| `forbidden` | 403 | Auth present but insufficient permissions |
| `not_found` | 404 | Resource not found |
| `conflict` | 409 | Duplicate / state conflict |
| `idempotency_key_required` | 400 | Missing Idempotency-Key header |
| `rate_limited` | 429 | Upstream rate limit |
| `internal_error` | 500 | Unexpected server error |
| `upstream_error` | 502 | Supabase/external service error |

Source: `lib/api/error-envelope.ts:16–49`

### NFR-REL-003: Fire-and-Forget for Non-Critical Operations

| Aspect | Value |
|--------|-------|
| **Target** | Audit/logging operations must never fail the user request |
| **Implementation** | Magic-link issuance audit (`recordIssuance`) and PAT `last_used_at` update (`touchLastUsed`) are `void`-dispatched — errors swallowed |
| **Evidence** | `app/api/v1/auth/magic-link/route.ts:54–58`; `lib/api/middleware/bearer.ts:129–140` |

### NFR-REL-004: Error Boundary Pages — NOT CONFIRMED

| Aspect | Value |
|--------|-------|
| **Target** | Graceful degradation on server component errors |
| **Implementation** | Next.js App Router supports `error.tsx` files per route segment. No `error.tsx` file found in `app/` directory. |
| **Evidence** | Directory listing — no `error.tsx` files found in `app/(app)/` or `app/(auth)/` |

**Recommendation:** Add `error.tsx` at the `(app)` group level minimum to prevent full-page crashes surfacing raw Next.js error pages to users.

### NFR-REL-005: No Retry Logic

| Aspect | Value |
|--------|-------|
| **Target** | N/A — no retry implemented |
| **Implementation** | No retry logic, exponential backoff, or circuit breakers found in `lib/` or `app/api/`. Failures are returned immediately as `upstream_error` or `internal_error`. |
| **Evidence** | `lib/api/` — no retry imports or patterns |

---

## 4. Scalability

### NFR-SCALE-001: Stateless Architecture

| Aspect | Value |
|--------|-------|
| **Target** | Any serverless function instance can handle any request |
| **Implementation** | No in-memory state on the server. Session state lives in Supabase Auth JWTs (stored in client cookies). Active workspace preference in `bk_active_ws` httpOnly cookie. No Redis/Memcached required for sessions. |
| **Evidence** | `lib/supabase/server.ts` (SSR cookie-based Supabase client), `lib/api/workspace-cookie.ts` |

### NFR-SCALE-002: Serverless Deployment (Vercel)

| Aspect | Value |
|--------|-------|
| **Target** | Auto-scaling to traffic demand |
| **Implementation** | Deployed on Vercel — Next.js Route Handlers run as serverless functions. No persistent process; each request is independent. |
| **Evidence** | `.agents/project.yaml` `webapp_domain: upexbunkai.vercel.app` |

### NFR-SCALE-003: No Async Queue / Background Workers

| Aspect | Value |
|--------|-------|
| **Target** | N/A — not implemented |
| **Implementation** | No message queue (BullMQ, pg-boss, etc.) detected. All operations are synchronous request/response. Magic-link audit and PAT last_used_at are fire-and-forget void calls, not queued. |
| **Evidence** | `package.json` — no queue library dependencies |

**Note:** When run execution (`run:execute`) is implemented, async workers will be needed for long-running test run coordination.

### NFR-SCALE-004: Supabase Connection Pooling

| Aspect | Value |
|--------|-------|
| **Target** | [Unknown] — Supabase manages pooling; specific pool size not configured in app |
| **Implementation** | Supabase JS SDK manages connection pool internally. No explicit `pool_size` or `DATABASE_POOL_SIZE` env var found. Serverless functions are stateless — no persistent connection held between requests. |
| **Evidence** | `lib/supabase/server.ts` — `createServerClient(URL, KEY, cookieConfig)` — no pool options |

---

## 5. Observability

### NFR-OBS-001: Structured JSON Logging

| Aspect | Value |
|--------|-------|
| **Target** | Every API request produces a structured log line on stdout |
| **Implementation** | `withApiHandler` wraps all route handlers and calls `logRequest` (success/error). Output is single-line JSON with `level`, `ts`, `component`, `request_id`, `method`, `path`, `status`, `duration_ms`. Errors include `error_code` and `message`. |
| **Evidence** | `lib/api/logging.ts:1–34`, `lib/api/handler.ts:38–58` |

**Log shape:**
```json
{
  "level": "info" | "warn" | "error",
  "ts": "2026-05-31T10:00:00.000Z",
  "component": "api",
  "request_id": "uuid",
  "method": "POST",
  "path": "/api/v1/auth/magic-link",
  "status": 200,
  "duration_ms": 142
}
```

Source: `lib/api/logging.ts:18–33`

### NFR-OBS-002: Request ID Propagation

| Aspect | Value |
|--------|-------|
| **Target** | Every request traceable by ID across logs |
| **Implementation** | `x-request-id` header read from incoming request (clients can inject) or freshly minted UUID. Set on every outgoing response. Included in error envelope body. |
| **Evidence** | `lib/api/request-id.ts`, `lib/api/handler.ts:43` |

### NFR-OBS-003: APM / Metrics / Alerting — NOT IMPLEMENTED

| Aspect | Value |
|--------|-------|
| **Target** | [Not implemented] |
| **Implementation** | No Sentry, Datadog, New Relic, or OpenTelemetry found in `package.json` or source. Vercel captures stdout logs and displays them in the dashboard, but no structured APM tracing. |
| **Evidence** | `package.json` — no `@sentry/*`, `@datadog/*`, `@opentelemetry/*` dependencies |

**Recommendation:** Integrate `@sentry/nextjs` at minimum for error tracking and performance monitoring. Sentry has zero-config Next.js integration with automatic route handler instrumentation.

### NFR-OBS-004: Activity Log Table (Write-Only in MVP)

| Aspect | Value |
|--------|-------|
| **Target** | Workspace audit trail available for future reporting |
| **Implementation** | `activity_log` table exists (migration 0009). Written by service_role only. No read API endpoint found — accessible only via Supabase Studio or DBHub MCP in MVP. |
| **Evidence** | `supabase/migrations/0009_cross_cutting.sql`, domain-glossary.md §1 cross-cutting entities |

---

## 6. Compliance

| Standard | Status | Notes |
|----------|--------|-------|
| GDPR | Needs Review | No data retention policy, no user deletion endpoint, no consent mechanism found in codebase. `magic_link_tokens` stores email + user-agent. `activity_log` stores audit data. |
| SOC2 | Needs Review | Structured logging present; access controls via RLS; no formal audit trail read API; no penetration test evidence. |
| HIPAA | Not Applicable | No PHI processed — test management tool only. |
| PCI-DSS | Not Applicable | No payment data handled in-product (plan field exists but no payment processor integrated). |

---

## 7. Discovery Gaps

| Gap | Impact | Suggested Next Step |
|----|--------|-------------------|
| No HTTP security headers | CSP, HSTS, X-Frame-Options absent — potential XSS/clickjacking vectors | Add `headers()` to `next.config.ts`; run OWASP ZAP automated scan |
| No rate limiting on auth endpoints | `/api/v1/auth/magic-link` and `/api/v1/auth/signin` can be abused | Implement Upstash Redis rate limiter (already noted in code as "Phase F") |
| No APM / error tracking | Production errors not captured beyond Vercel stdout | Add `@sentry/nextjs` |
| No `error.tsx` boundaries | Server component errors show raw Next.js error pages | Add `error.tsx` at `(app)` group level |
| Supabase connection pool size unknown | Cannot estimate concurrent request ceiling | Query Supabase project settings or `pg_stat_activity` |
| No load test data — all perf numbers inferred | Cannot state P95/P99 response time targets with evidence | Run k6 or Artillery against staging |
| No user deletion / GDPR right-to-erasure endpoint | Potential GDPR compliance gap | Audit data retention needs with product team |
| Activity log has no read API | Audit trail not accessible to workspace owners | Add `GET /api/v1/workspaces/{id}/activity` endpoint (after assessing access control) |

---

## 8. QA Relevance

### Testable NFRs

| NFR | Testable? | Suggested Tool / Approach |
|----|----------|--------------------------|
| NFR-SEC-001: RLS isolation | Yes — P0 | DBHub MCP + API tests: User B SELECT on User A's workspace → 0 rows |
| NFR-SEC-002: Secret isolation | Yes — P0 | DBHub MCP: `qa_inspector_ro` SELECT on `access_token_secrets` → permission denied |
| NFR-SEC-005: Open-redirect guard | Yes — P1 | API test: `POST /api/v1/auth/magic-link` with `?next=//evil.com` → callback redirects to `/projects` |
| NFR-SEC-008: Input validation | Yes — P1 | Zod boundary tests on all endpoints |
| NFR-REL-001: Health endpoint | Yes — P1 | `GET /api/v1/health` → 200 `{ok:true}` |
| NFR-REL-002: Error envelope | Yes — P1 | All error paths produce `{error:{code,message}}` shape |
| NFR-OBS-001: Structured logging | Yes — P2 | Verify Vercel log format during E2E runs |
| NFR-PERF-001: GIN search | Yes — P2 | Search ATCs by title prefix and tag — assert correct results |
| NFR-PERF-002: OpenAPI caching | Yes — P2 | `GET /api/openapi` returns `Cache-Control: public, max-age=300` |

### Suggested Tools by Category

| Category | Tool |
|----------|------|
| Performance / load | k6, Artillery |
| Security scanning | OWASP ZAP (automated), Burp Suite (manual) |
| RLS / DB validation | DBHub MCP (`qa_inspector_ro` role) |
| API contract testing | Playwright API mode + OpenAPI spec diff (`bun run openapi:diff`) |
| Error monitoring | Sentry (recommend adding before production load) |
