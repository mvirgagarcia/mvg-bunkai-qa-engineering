# PRD — Executive Summary

> Product: Bunkai TMS
> Phase: 2 — Architecture
> Generated: 2026-05-31
> Confidence: High — evidence from code, migrations, design docs, and qa-config.

---

## 1. Problem Statement

### The Challenge

QA teams managing large test suites lack a structured, developer-native tool for authoring, organizing, and tracing Acceptance Test Cases (ATCs) back to the user stories and acceptance criteria that motivated them.

> "QAs manage hundreds of ATCs daily. Spacing exists to clarify, not to relax."
> Source: `DESIGN.md §1`

Most existing Test Management Systems are either too heavy (enterprise Jira-Xray), too generic (spreadsheets), or disconnected from code workflows. The specific gap Bunkai addresses is **structural traceability**: the connection between a test case and the business intent it validates is optional in most tools and optional means it gets skipped.

> "Stories are the unit of business intent anchored to a Module. Each story has N sortable acceptance criteria (AC). ATCs in 0004 link to AC via a M:N table to satisfy the anchoring moat (an ATC must reference at least one AC)."
> Source: `supabase/migrations/0003_authoring.sql` comment

### Architecture As a Moat

Bunkai enforces that every ATC is structurally bound to at least one Acceptance Criterion — making orphan test cases architecturally impossible, not just discouraged by process. This is the "anchoring moat."

> "bound to ≥1 acceptance criterion via `atc_acceptance_criteria` (the anchoring moat — enforced at the application layer in MVP, made structural by FK)."
> Source: `supabase/migrations/0004_atcs.sql` comment

### Current Alternatives

No direct comparison data found in codebase. The comment in `DESIGN.md` alludes to "developer-first, opinionated about quality" as a design axiom, suggesting the product intentionally positions against process-heavy, ticket-centric tools.

---

## 2. Solution Overview

### Product Vision

A test management system that decomposes user stories into executable Acceptance Test Cases, with structural enforcement of the link between tests and business intent.

Source: `app/(auth)/login/page.tsx:68–74` — "A test management system that decomposes user stories into executable Acceptance Test Cases."

### Core Capabilities

| # | Feature | Problem Addressed | Evidence |
|---|---------|-------------------|----------|
| 1 | ATC authoring with structural AC anchoring | Orphan test cases with no business justification | `supabase/migrations/0004_atcs.sql`, `components/atcs/AnchoringPanel.tsx` |
| 2 | Hierarchical module tree (max depth 6) organizing stories + ATCs | Flat test lists with no structure | `supabase/migrations/0002_projects_modules.sql`, `lib/tree.ts`, `components/layout/Sidebar.tsx` |
| 3 | Multi-tenant workspace RBAC (viewer/member/admin/owner) | Team isolation and access control | `supabase/migrations/0001_tenancy.sql`, `middleware.ts` |
| 4 | Magic-link + headless email/password authentication | Passwordless onboarding + CI/agent access | `app/api/v1/auth/magic-link/route.ts`, `app/api/v1/auth/signup/route.ts` |
| 5 | Personal Access Tokens (PAT) with fine-grained scopes | Headless CLI/AI-agent API access | `supabase/migrations/0008_access_tokens.sql`, `lib/api/pat.ts` |

### Key Differentiators

1. **Anchoring moat** — ATC→AC linkage is architecturally enforced, not optional. Source: `supabase/migrations/0004_atcs.sql` `atc_acceptance_criteria` table + `AnchoringPanel.tsx` blocking save without AC selection.
2. **Three-layer classification** — ATCs are typed as `UI`, `API`, or `Unit`, mapping directly to automation stack layers. Source: `DESIGN.md §3.6`, `supabase/migrations/0004_atcs.sql` check constraint.
3. **Full-text search on ATCs** — GIN-indexed `tsv` tsvector column enables tag-prefix and fuzzy queries at scale. Source: `supabase/migrations/0004_atcs.sql` `atcs_tsv_gin_idx`.
4. **Open-source, self-hostable** — Apache-2.0, `docker compose up` advertised on login page. Source: `app/(auth)/login/page.tsx:103`, `app/(auth)/login/page.tsx:180`.

---

## 3. Success Metrics

### Tracked Metrics

No analytics SDK (Posthog, Mixpanel, Amplitude, Segment) found in `package.json` or `app/`. No `track()` or `analytics.event()` calls found. All metrics below are inferred.

| Metric | Type | Implementation | Source |
|--------|------|----------------|--------|
| N/A | — | No analytics tracking implemented | `package.json` — no analytics dependency |

### Inferred KPIs (from features, not real tracking)

| Metric | Inference Basis |
|--------|----------------|
| ATC count per workspace | `atcs` table + project/module hierarchy |
| AC anchor coverage (% ATCs with ≥1 AC) | `atc_acceptance_criteria` M:N table |
| Active members per workspace | `workspace_members` where `status='active'` |
| PAT usage (last_used_at recency) | `access_tokens.last_used_at` updated on every Bearer call (`lib/api/middleware/bearer.ts:106`) |
| Magic-link issuance volume | `magic_link_tokens` table tracks issuances |

### Unknown Metrics

| Metric | Gap |
|--------|-----|
| Daily/monthly active users | No analytics SDK configured |
| ATC search query volume | No query logging |
| Invite acceptance rate | Derivable from `workspace_invites` but no dashboard |
| Time-to-first-ATC for new workspaces | No event tracking |

---

## 4. Target Users

See [User Personas](./user-personas.md) for full detail.

| Role | System Role | Core Need | Evidence |
|------|-------------|-----------|----------|
| Workspace Owner | `owner` | Create and manage the workspace, projects, team | `supabase/migrations/0001_tenancy.sql` `workspace_members.role` |
| Workspace Admin | `admin` | Invite teammates, manage membership and invites | `app/api/v1/workspaces/[id]/invites/route.ts` RLS gate |
| QA Engineer | `member` | Author ATCs, link to stories and ACs, classify by layer | `components/atcs/AtcEditor.tsx`, `components/atcs/AnchoringPanel.tsx` |
| CI / AI Agent | headless `bearer` | Read/write ATCs programmatically via PAT | `lib/api/pat.ts`, `app/qa/qa-config.ts` patScopes |

---

## 5. Product Scope

### What's Included (Current State)

- Magic-link (OTP email) authentication + headless email/password for CI/agents
- Personal Access Token (PAT) issuance, listing, revocation with scope gating
- Multi-tenant workspace creation (RBAC, RLS, invite-based onboarding)
- Project and hierarchical module management (max depth 6)
- ATC creation/editing with steps (Markdown), assertions (YAML), AC anchoring (required)
- ATC status tracking (unrun/running/pass/fail/blocked/skipped)
- Full-text ATC search (GIN index on `tsv` tsvector)
- Workspace invite flow with 7-day expiry, token rotation, revocation
- REST API under `/api/v1/` with OpenAPI spec at `/api/openapi` + Scalar UI at `/api/docs`
- Health endpoint `GET /api/v1/health`
- Idempotency-Key header support for POST operations

### What's Not Included

- ATC run execution / test run reporting (`run:execute` PAT scope exists but no `/api/v1/runs` endpoint found — `supabase/migrations` has no `runs` table)
- External story sync (Jira/GitHub linking — `user_stories.external_id` / `external_url` fields exist but no sync endpoint)
- Email delivery for invites (MVP returns `accept_url` in API response; logged to stdout) — `app/api/v1/workspaces/[id]/invites/route.ts:79` `console.log`
- Feature flag management UI (table + scopes exist in migration 0009; no admin UI or API endpoint)
- Activity log reader API (table exists in migration 0009; no read endpoint)
- OAuth (GitHub, Google) — buttons visible on login page, marked `disabled` with label "soon" — `app/(auth)/login/page.tsx:139,149`
- Project creation UI — "Project creation UI ships in Phase E" — `app/(app)/projects/page.tsx:51`
- Multi-workspace switcher UI — "Phase E will replace the empty-state placeholder" — `app/(app)/projects/page.tsx:9`
- Payment / plan gating — `workspaces.plan` field exists (`community`/`cloud`/`enterprise`) but no billing logic found

### Future Indicators

| Signal | Type | Source |
|--------|------|--------|
| `run:execute` PAT scope | Planned feature | `supabase/migrations/0008_access_tokens.sql`, `app/qa/qa-config.ts` |
| OAuth GitHub + Google buttons (`disabled`, "soon") | Upcoming | `app/(auth)/login/page.tsx:139,149` |
| "Phase E" project creation UI | Planned | `app/(app)/projects/page.tsx:51` |
| `feature_flags` table | Gradual rollout infra | `supabase/migrations/0009_cross_cutting.sql` |
| `user_stories.external_id` / `external_url` | Planned Jira/GitHub sync | `supabase/migrations/0003_authoring.sql` |

---

## 6. Discovery Gaps

| Gap | Impact | Suggested Source |
|----|--------|-----------------|
| No analytics SDK — no real usage metrics | Cannot validate product-market fit or adoption KPIs | Add Posthog/Amplitude; instrument ATC creation + invite acceptance |
| Run execution is unimplemented | Core product loop (test authoring → execution → results) is incomplete | Roadmap / backlog ticket |
| Transactional email not wired (invites delivered via API response only) | Invitees only get the link if the inviter copies and sends it manually | Integrate Resend/SendGrid for invite emails |
| `plan` field has no gating logic | Revenue model is architectural intent only; no monetization today | Product roadmap |
| No rate limiting at middleware layer — only Supabase upstream passthrough | Abuse vector on `/api/v1/auth/magic-link` | Add rate-limit middleware (Upstash Redis / Vercel Edge Config) |

---

## 7. QA Relevance

### Critical Testing Areas

| Area | Why Critical | Test Approach |
|------|-------------|---------------|
| ATC anchoring moat | Core architectural constraint — save without AC must fail | POST ATC without `ac_ids`; expect save blocked |
| Multi-tenant RLS isolation | Cross-workspace data leakage is a P0 security bug | Login as User B, attempt SELECT on User A's workspace data; expect 0 rows |
| RBAC write gates | Viewer cannot mutate; all mutation paths must respect role | Test each CRUD operation with `viewer` role; expect 403 |
| PAT scope gating | Each scope must be independently enforced | Test `atc:read` PAT against write endpoints; expect 403 |
| Magic-link + headless auth paths | Two completely different auth flows, both must work | Browser: `login-email` + `login-submit` testids; Headless: `POST /api/v1/auth/signup` + `signin` |

### Risk Areas

| Risk | Evidence | Mitigation |
|------|----------|-----------|
| PAT hash comparison bug (already fixed) | `lib/api/middleware/bearer.ts:53–58` — comment documents a previous impl that hashed only `remainder`, causing 401 on every Bearer call | Regression test: PAT issued then used in Bearer call must succeed |
| Open-redirect in magic-link callback | `app/auth/callback/route.ts:17–19` — `safeNext` guard added | Test: `?next=//evil.com` must redirect to `/projects` |
| Invite token replay | `app/api/v1/invites/accept/route.ts:65` — `accepted_at` check | Test: accept same invite twice; expect 409 on second attempt |

---

## 8. Document References

| Document | Path | Status |
|----------|------|--------|
| User Personas | `.context/PRD/user-personas.md` | Produced — Phase 2 |
| User Journeys | `.context/PRD/user-journeys.md` | Produced — Phase 2 |
| Business Feature Map | `.context/business/business-feature-map.md` | Pending — run `/business-feature-map` |
| Architecture Specs | `.context/SRS/architecture.md` | Produced — Phase 2 |
| Functional Specs | `.context/SRS/functional-specs.md` | Produced — Phase 2 |
| Non-Functional Specs | `.context/SRS/non-functional-specs.md` | Produced — Phase 2 |
| Domain Glossary | `.context/business/domain-glossary.md` | Produced — Phase 1 |
| Business Model | `.context/business/business-model.md` | Produced — Phase 1 |
| Project Config | `.context/project-config.md` | Produced — Phase 1 |
| Business API Map | `.context/business/business-api-map.md` | Pending — run `/business-api-map` |
