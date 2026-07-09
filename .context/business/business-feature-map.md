# BUNKAI TMS — BUSINESS FEATURE MAP

> Generated: 2026-06-01
> Source files: `app/api/`, `app/(app)/`, `app/(auth)/`, `components/`, `lib/`, `middleware.ts`, `package.json`, `app/qa/qa-config.ts`
> Companion docs: `business-data-map.md` (flows, state machines, entity relations) · `domain-glossary.md` (entity reference) · `SRS/functional-specs.md` (FR/BR index)
> Do NOT duplicate flow diagrams or state machines here — link to `business-data-map.md`.

---

## 1. Inventory Summary

| Category | Features (FEATs) | Stable | Beta | WIP | Planned |
|----------|----------------:|:------:|:----:|:---:|:-------:|
| Authentication | 5 (FEAT-001–005) | 4 | 0 | 1 | 0 |
| Workspace Management | 5 (FEAT-006–010) | 4 | 0 | 1 | 0 |
| Access Tokens / PAT | 4 (FEAT-011–014) | 4 | 0 | 0 | 0 |
| Project Management | 2 (FEAT-015–016) | 1 | 0 | 0 | 1 |
| Module Management | 2 (FEAT-017–018) | 1 | 0 | 0 | 1 |
| User Story Management | 2 (FEAT-019–020) | 1 | 0 | 0 | 1 |
| ATC (Acceptance Test Cases) | 4 (FEAT-021–024) | 2 | 0 | 1 | 1 |
| Test Execution / Runs | 1 (FEAT-025) | 0 | 0 | 0 | 1 |
| Workspace Invites | 4 (FEAT-026–029) | 4 | 0 | 0 | 0 |
| Health / System | 3 (FEAT-030–032) | 3 | 0 | 0 | 0 |
| **TOTAL** | **32** | **24** | **0** | **2** | **6** |

**Status definitions:**
- **Stable** — Implemented, handler found, tested signal present
- **Beta** — Implemented but incomplete or not regression-tested
- **WIP** — Scaffolded / partially built, not releasable
- **Planned** — Scope defined in code comments, no handler yet

---

## 2. Feature Catalog

### Domain: Authentication

---

#### FEAT-001 — Magic-Link Authentication (passwordless OTP)

| Field | Value |
|-------|-------|
| Status | **Stable** |
| Persona(s) | All human users (owner, admin, member, viewer) |
| Auth required | No (unauthenticated entry point) |

**Endpoints:**
- `POST /api/v1/auth/magic-link` — request OTP email
- `GET /auth/callback` — exchange OTP code for session cookie

**UI Pages/Components:**
- `app/(auth)/login/page.tsx` — login page with magic-link form
- `app/(auth)/login/magic-link-form.tsx` — email input form
- `app/auth/callback/route.ts` — OTP exchange + redirect handler
- `data-testid`: `login-email`, `login-submit`

**Capabilities checklist:**
- ✅ Accept email + optional `next` path
- ✅ Call `supabase.auth.signInWithOtp`
- ✅ Best-effort audit record in `magic_link_tokens` + `magic_link_token_secrets`
- ✅ Exchange OTP code for session cookie at `/auth/callback`
- ✅ Open-redirect guard (`safeNext` — `next` must start with `/`, not `//`)
- ✅ Propagate Supabase 429 rate-limit as HTTP 429
- ❌ Email delivery rate limiting (Phase F — no application-layer rate limiter)
- ❌ OAuth (GitHub/Google buttons on login page are `disabled`, label "soon")

**Evidence:** `app/api/v1/auth/magic-link/route.ts`, `app/auth/callback/route.ts`
**Business rules:** BR-004 (passwordless), BR-008 (open-redirect guard)
→ See `business-data-map.md` Flow 2 for sequence diagram.

---

#### FEAT-002 — Headless User Provisioning (signup + PAT mint)

| Field | Value |
|-------|-------|
| Status | **Stable** |
| Persona(s) | CI / AI Agent |
| Auth required | No (bootstrap endpoint) |

**Endpoints:**
- `POST /api/v1/auth/signup`

**Capabilities checklist:**
- ✅ Create Supabase user with `email_confirm: true` (bypasses OTP)
- ✅ Immediately sign in + populate session cookies
- ✅ Mint PAT in same response (one round-trip provisioning)
- ✅ Return `{user, session, pat}` with `warning: "Store the PAT token now"`
- ✅ 409 Conflict if email already exists
- ❌ Idempotency-Key not wired on this endpoint

**Evidence:** `app/api/v1/auth/signup/route.ts`
**Business rules:** BR-005 (PAT shown once), BR-009 (headless bypasses email confirm)
→ See `business-data-map.md` Flow 3.

---

#### FEAT-003 — Headless Sign-In (email/password + PAT mint)

| Field | Value |
|-------|-------|
| Status | **Stable** |
| Persona(s) | CI / AI Agent |
| Auth required | No |

**Endpoints:**
- `POST /api/v1/auth/signin`

**Capabilities checklist:**
- ✅ `signInWithPassword` + session cookie population
- ✅ Mint fresh PAT in same response
- ✅ Uniform 401 on invalid credentials (no email-existence oracle)
- ✅ Optional `pat_name`, `pat_scopes`, `pat_expires_in_days` parameters

**Evidence:** `app/api/v1/auth/signin/route.ts`
**Business rules:** BR-019 (uniform 401, no detail leak)
→ See `business-data-map.md` Flow 3.

---

#### FEAT-004 — Session Authentication (cookie-based)

| Field | Value |
|-------|-------|
| Status | **Stable** |
| Persona(s) | All human personas |
| Auth required | Enforced by middleware |

**Endpoints:** N/A — enforced by `middleware.ts`

**UI Pages/Components:**
- `middleware.ts` — session check on `PROTECTED_PREFIXES` (`/projects`, `/onboarding`)
- `components/providers/auth-context.tsx` — React auth context for client components

**Capabilities checklist:**
- ✅ Session check before serving protected routes
- ✅ Redirect to `/login?next={path}` for unauthenticated requests
- ✅ Supabase session cookie refresh on every edge request
- ✅ Public routes exempted (`/login`, `/auth`, `/api/auth`)

**Evidence:** `middleware.ts`, `components/providers/auth-context.tsx`

---

#### FEAT-005 — OAuth (GitHub / Google) — WIP

| Field | Value |
|-------|-------|
| Status | **WIP** |
| Persona(s) | All human personas (future) |
| Auth required | No |

**Capabilities checklist:**
- ❌ No OAuth handler routes found
- ❌ GitHub button on login page rendered with `disabled` attribute and "soon" label
- ❌ Google button on login page rendered with `disabled` attribute and "soon" label

**Evidence:** `app/(auth)/login/page.tsx:139,149` — disabled buttons with "soon" label

---

### Domain: Workspace Management

---

#### FEAT-006 — Workspace Creation (Bootstrap)

| Field | Value |
|-------|-------|
| Status | **Stable** |
| Persona(s) | Any authenticated user (becomes owner) |
| Auth required | Cookie session |

**Endpoints:**
- `POST /api/v1/workspaces`

**UI Pages/Components:**
- `app/(app)/onboarding/page.tsx` — redirect gate (goes to `/projects` if already member)
- `app/(app)/onboarding/onboarding-form.tsx` — workspace name + slug form

**Capabilities checklist:**
- ✅ Zod validation: slug 3–40 chars, `^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$`, not reserved
- ✅ 17-item reserved slug blocklist (`admin`, `api`, `auth`, `login`, etc.)
- ✅ Atomic `bunkai_bootstrap_workspace` RPC (SECURITY DEFINER) — workspace + owner membership in one transaction
- ✅ 409 on slug collision (`SQLSTATE 23505`)
- ✅ Caller auto-enrolled as `owner` with `status='active'`
- ✅ Default plan = `community`

**Evidence:** `app/api/v1/workspaces/route.ts` POST handler, `supabase/migrations/0006_bootstrap_workspace.sql`
**Business rules:** BR-002 (slug uniqueness/format), BR-010 (owner auto-enrollment)

---

#### FEAT-007 — Workspace List

| Field | Value |
|-------|-------|
| Status | **Stable** |
| Persona(s) | All personas (cookie + Bearer) |
| Auth required | Cookie session or Bearer PAT |

**Endpoints:**
- `GET /api/v1/workspaces`

**Capabilities checklist:**
- ✅ Cookie path: RLS-filtered select (session user sees only member workspaces)
- ✅ Bearer path: admin client + manual `workspace_members` join (RLS bypass with manual scoping)
- ✅ Ordered by `created_at` ascending

**Evidence:** `app/api/v1/workspaces/route.ts` GET handler

---

#### FEAT-008 — Workspace Details + Rename

| Field | Value |
|-------|-------|
| Status | **Stable** |
| Persona(s) | GET: all members; PATCH: owner only |
| Auth required | Cookie session |

**Endpoints:**
- `GET /api/v1/workspaces/{id}`
- `PATCH /api/v1/workspaces/{id}` — rename (name field only; owner-only via RLS)

**Capabilities checklist:**
- ✅ GET returns workspace metadata (id, slug, name, plan, owner_user_id, created_at)
- ✅ PATCH allows `name` update only
- ✅ RLS gates PATCH to owner role (returns 403 for non-owners via zero-row maybeSingle)
- ❌ Slug rename not supported (no slug PATCH)
- ❌ Workspace delete endpoint not found

**Evidence:** `app/api/v1/workspaces/[id]/route.ts`

---

#### FEAT-009 — Workspace Member Management

| Field | Value |
|-------|-------|
| Status | **Stable** (read + invite UI), **Planned** (suspend/reinstate endpoint) |
| Persona(s) | Members page: all authenticated; mutations: admin/owner |
| Auth required | Cookie session |

**Endpoints:**
- No dedicated `GET /api/v1/workspaces/{id}/members` — members read directly via Supabase client from RSC

**UI Pages/Components:**
- `app/(app)/workspaces/[id]/members/page.tsx` — RSC fetches workspace + members + invites
- `app/(app)/workspaces/[id]/members/members-client.tsx` — invite form + member/invite tables

**Capabilities checklist:**
- ✅ Members list with role + status + joined_at
- ✅ Invites list with derived status (pending/accepted/revoked/expired)
- ✅ Invite form (email + role selector) via `POST /api/v1/workspaces/{id}/invites`
- ✅ Resend invite button via `POST /api/v1/workspaces/{id}/invites/{inviteId}`
- ✅ Revoke invite button via `DELETE /api/v1/workspaces/{id}/invites/{inviteId}`
- ❌ Suspend member endpoint not found (`PATCH /api/v1/workspaces/{id}/members/{userId}` absent)
- ❌ Reinstate member endpoint not found
- ❌ Member display names — no `profiles` table; `user_id` UUID only visible

**Evidence:** `app/(app)/workspaces/[id]/members/page.tsx`, `app/(app)/workspaces/[id]/members/members-client.tsx`

---

#### FEAT-010 — Active Workspace Selection

| Field | Value |
|-------|-------|
| Status | **Stable** |
| Persona(s) | Cookie-authenticated users |
| Auth required | Cookie session |

**Endpoints:**
- `POST /api/v1/me/active-workspace`

**UI Pages/Components:**
- `components/layout/WorkspaceSwitcher.tsx` — dropdown calls `GET /api/v1/me` + `POST /api/v1/me/active-workspace`

**Capabilities checklist:**
- ✅ Sets `bk_active_ws` httpOnly cookie with workspace UUID
- ✅ RLS-validates caller is member of target workspace
- ✅ GET `/api/v1/me` respects `bk_active_ws` cookie when determining `active_workspace_id`
- ❌ Multi-workspace switcher UI is Phase E placeholder (empty state in `app/(app)/projects/page.tsx:51`)

**Evidence:** `app/api/v1/me/active-workspace/route.ts`, `components/layout/WorkspaceSwitcher.tsx`, `lib/api/workspace-cookie.ts`

---

### Domain: Access Tokens / PAT

---

#### FEAT-011 — PAT Issuance (Mint)

| Field | Value |
|-------|-------|
| Status | **Stable** |
| Persona(s) | All session-authenticated personas |
| Auth required | Cookie session (PAT cannot create PAT) |

**Endpoints:**
- `POST /api/v1/tokens`

**Capabilities checklist:**
- ✅ Generate 32-byte random secret (`crypto.getRandomValues`)
- ✅ Format: `bk_pat_<12-char-prefix>.<remainder>`
- ✅ Store SHA-256 hash in `access_token_secrets` (sibling table, QA roles cannot read)
- ✅ Optional: `name`, `workspace_id` (scope token to workspace), `expires_in_days` (max 365)
- ✅ Required: `scopes` (min 1, from `atc:read | atc:write | run:execute | workspace:admin`)
- ✅ Returns raw token ONCE with warning string
- ✅ Also minted automatically on signup/signin responses

**Evidence:** `app/api/v1/tokens/route.ts` POST, `lib/api/pat.ts`
**Business rules:** BR-005, BR-015 (session required — no PAT-from-PAT issuance)

---

#### FEAT-012 — PAT Listing

| Field | Value |
|-------|-------|
| Status | **Stable** |
| Persona(s) | All session-authenticated personas |
| Auth required | Cookie session |

**Endpoints:**
- `GET /api/v1/tokens`

**Capabilities checklist:**
- ✅ Returns `id, name, scopes, workspace_id, token_prefix, expires_at, revoked_at, last_used_at, created_at`
- ✅ Secret (hash) never returned
- ✅ Ordered by `created_at` descending
- ✅ RLS enforces ownership (only caller's own tokens)

**Evidence:** `app/api/v1/tokens/route.ts` GET

---

#### FEAT-013 — PAT Revocation

| Field | Value |
|-------|-------|
| Status | **Stable** |
| Persona(s) | Token owner only |
| Auth required | Cookie session |

**Endpoints:**
- `DELETE /api/v1/tokens/{id}` — soft-revoke (sets `revoked_at`)

**Capabilities checklist:**
- ✅ Soft delete: `revoked_at = now()`, row preserved for audit trail
- ✅ 204 No Content on success
- ✅ 404 if token not found or already revoked (RLS ownership enforced)
- ✅ Revoked token fails Bearer auth on next request with 401

**Evidence:** `app/api/v1/tokens/[id]/route.ts`
**Business rules:** BR-016 (soft revocation), BR-017 (uniform 401 on expired/revoked)

---

#### FEAT-014 — Bearer PAT Authentication (per-request verification)

| Field | Value |
|-------|-------|
| Status | **Stable** |
| Persona(s) | CI / AI Agent |
| Auth required | Bearer token in `Authorization` header |

**Endpoints:** Applied to all Bearer-capable routes (see Section 4)

**Capabilities checklist:**
- ✅ Token format validation (`bk_pat_` prefix)
- ✅ Prefix-based candidate lookup (O(1) indexed, ≤5 candidates)
- ✅ SHA-256 hash comparison (constant-time)
- ✅ Revocation check (`revoked_at IS NULL`)
- ✅ Expiry check (`expires_at > now()` when set)
- ✅ Uniform 401 on all failure paths (no detail oracle)
- ✅ Scope enforcement via `requireScope(ctx, scope)` → 403 with scope name
- ✅ Fire-and-forget `last_used_at` update on each successful call

**Evidence:** `lib/api/middleware/bearer.ts`, `lib/api/auth.ts`
**Business rules:** BR-017 (uniform 401), BR-019 (no detail leak)
→ See `business-data-map.md` Flow 4 for verification sequence.

---

### Domain: Project Management

---

#### FEAT-015 — Project List + Navigation

| Field | Value |
|-------|-------|
| Status | **Stable** |
| Persona(s) | All authenticated personas |
| Auth required | Cookie session |

**Endpoints:** None (read direct from RSC via Supabase client)

**UI Pages/Components:**
- `app/(app)/projects/page.tsx` — routing hub (no membership → `/onboarding`; has projects → redirect to first)
- `app/(app)/projects/[projectSlug]/page.tsx` — project ATC list view

**Capabilities checklist:**
- ✅ Auto-redirect to first project by `created_at` ascending
- ✅ Empty state shown when workspace has no projects ("Project creation UI ships in Phase E")
- ✅ ATC table with sorting by title/layer/module/status/version
- ✅ Module tree sidebar (Explorer panel)
- ✅ Topbar with project + workspace breadcrumb
- ❌ Project creation UI (Phase E)
- ❌ Project rename / delete endpoints not found

**Evidence:** `app/(app)/projects/page.tsx`, `app/(app)/projects/[projectSlug]/page.tsx`

---

#### FEAT-016 — Project CRUD API — Planned

| Field | Value |
|-------|-------|
| Status | **Planned** (Phase E) |
| Persona(s) | member, admin, owner |
| Auth required | Cookie session or PAT with `atc:write` |

**Endpoints:**
- `POST /api/v1/projects` — **NOT IMPLEMENTED**
- `PATCH /api/v1/projects/{id}` — **NOT IMPLEMENTED**
- `DELETE /api/v1/projects/{id}` — **NOT IMPLEMENTED**

**Capabilities checklist:**
- ❌ No project creation API endpoint found
- ❌ No project update endpoint found
- ❌ No project delete endpoint found

**Evidence:** `app/(app)/projects/page.tsx:51` comment — "Project creation UI ships in Phase E"

---

### Domain: Module Management

---

#### FEAT-017 — Module Tree Read (Explorer Sidebar)

| Field | Value |
|-------|-------|
| Status | **Stable** |
| Persona(s) | All authenticated personas |
| Auth required | Cookie session |

**Endpoints:** None (read direct from RSC via Supabase client)

**UI Pages/Components:**
- `components/layout/Sidebar.tsx` — collapsible module tree
- `lib/tree.ts` — flat DB arrays → `ModuleTreeNode[]` in-memory builder

**Capabilities checklist:**
- ✅ Self-referential tree display (max depth 6, `path` column breadcrumb)
- ✅ Shows module → user_stories → acceptance_criteria + ATCs in each story
- ✅ Expand/collapse nodes (auto-expand depth < 2)
- ✅ Active ATC highlight
- ✅ In-memory tree build (no recursive DB query)

**Evidence:** `components/layout/Sidebar.tsx`, `lib/tree.ts`

---

#### FEAT-018 — Module CRUD API — Planned

| Field | Value |
|-------|-------|
| Status | **Planned** (Phase E) |
| Persona(s) | member, admin, owner |
| Auth required | Cookie session or PAT with `atc:write` |

**Endpoints:**
- `POST /api/v1/modules` — **NOT IMPLEMENTED**
- `PATCH /api/v1/modules/{id}` — **NOT IMPLEMENTED**
- `DELETE /api/v1/modules/{id}` — **NOT IMPLEMENTED**

**Capabilities checklist:**
- ❌ No module creation/edit/delete endpoints found

**Evidence:** `business-data-map.md` Discovery Gap #2

---

### Domain: User Story Management

---

#### FEAT-019 — User Story Read (via ATC Editor)

| Field | Value |
|-------|-------|
| Status | **Stable** |
| Persona(s) | All authenticated personas |
| Auth required | Cookie session |

**Endpoints:** None (RSC query in ATC editor page)

**UI Pages/Components:**
- `app/(app)/projects/[projectSlug]/atcs/[atcId]/page.tsx` — fetches all stories for project
- `components/atcs/AnchoringPanel.tsx` — story picker with search + AC checkboxes

**Capabilities checklist:**
- ✅ Stories loaded server-side for ATC anchoring picker
- ✅ AnchoringPanel searches stories by title or `external_id`
- ✅ Stories show `external_id` (Jira/GitHub ID) in search results when present

**Evidence:** `app/(app)/projects/[projectSlug]/atcs/[atcId]/page.tsx:47–58`

---

#### FEAT-020 — User Story / AC CRUD API — Planned

| Field | Value |
|-------|-------|
| Status | **Planned** (Phase E) |
| Persona(s) | member, admin, owner |
| Auth required | Cookie session or PAT with `atc:write` |

**Endpoints:**
- `POST /api/v1/user-stories` — **NOT IMPLEMENTED**
- `POST /api/v1/acceptance-criteria` — **NOT IMPLEMENTED**
- External sync (`user_stories.external_id`, `external_url`) — **NOT IMPLEMENTED**

**Capabilities checklist:**
- ❌ No user story create/update/delete endpoints found
- ❌ No acceptance criteria CRUD API found
- ❌ No Jira/GitHub sync endpoint despite `external_id` + `external_url` DB columns

**Evidence:** `business-data-map.md` Discovery Gap #2, `supabase/migrations/0003_authoring.sql`

---

### Domain: ATC (Acceptance Test Cases)

---

#### FEAT-021 — ATC List View

| Field | Value |
|-------|-------|
| Status | **Stable** |
| Persona(s) | All authenticated personas |
| Auth required | Cookie session |

**Endpoints:** None (RSC direct query)

**UI Pages/Components:**
- `components/atcs/AtcTable.tsx` — sortable table with columns: ID, Title, Layer, Module, Status, Version, Updated
- `app/(app)/projects/[projectSlug]/page.tsx` — page data loading

**Capabilities checklist:**
- ✅ Sortable by all columns (TanStack Table)
- ✅ Layer chip with color-coded badge (UI/API/Unit)
- ✅ Status badge (unrun/running/pass/fail/blocked/skipped)
- ✅ Link from title → ATC editor
- ✅ Module path shown (from `modules.path`)

**Evidence:** `components/atcs/AtcTable.tsx`, `app/(app)/projects/[projectSlug]/page.tsx`

---

#### FEAT-022 — ATC Edit/Save (via `bunkai_save_atc` RPC)

| Field | Value |
|-------|-------|
| Status | **Stable** |
| Persona(s) | member, admin, owner (viewer blocked by RLS) |
| Auth required | Cookie session |

**Endpoints:** None (Next.js server action, not REST endpoint)

**UI Pages/Components:**
- `app/(app)/projects/[projectSlug]/atcs/[atcId]/page.tsx` — editor page
- `components/atcs/AtcEditor.tsx` — Monaco-based editor with title, layer, tags, steps, assertions
- `components/atcs/AnchoringPanel.tsx` — story + AC picker (required before save)
- `components/atcs/StepEditor.tsx` — Monaco Markdown editor for steps
- `app/(app)/projects/[projectSlug]/atcs/[atcId]/actions.ts` — `saveAtcAction` server action

**Capabilities checklist:**
- ✅ Title text input
- ✅ Layer chip selector (UI / API / Unit)
- ✅ Tags (enter-delimited input)
- ✅ Steps editor (Monaco, Markdown format)
- ✅ Assertions editor (Monaco, YAML format)
- ✅ Story picker with search in AnchoringPanel
- ✅ AC checkbox selection (min 1 required — anchoring moat enforced)
- ✅ Application-layer validation: userStoryId required, acIds.length ≥ 1, title non-empty
- ✅ Atomic save via `bunkai_save_atc` RPC (full-replace children: steps, assertions, ac links)
- ✅ `version` increment on every save (DB-side in RPC)
- ✅ `tsv` tsvector rebuilt on every save (DB trigger `atcs_refresh_tsv`)
- ✅ `revalidatePath` for Next.js cache invalidation on success

**Evidence:** `app/(app)/projects/[projectSlug]/atcs/[atcId]/actions.ts`, `components/atcs/AtcEditor.tsx`, `lib/supabase/rpc.ts`, `supabase/migrations/0007_save_atc.sql`
**Business rules:** BR-001 (anchoring moat), BR-007 (viewer blocked), BR-018 (atomic save)
→ See `business-data-map.md` Flow 8.

---

#### FEAT-023 — ATC Full-Text Search

| Field | Value |
|-------|-------|
| Status | **Stable** (DB infrastructure); **WIP** (no dedicated search UI/API endpoint found) |
| Persona(s) | All authenticated personas |
| Auth required | Cookie session or `atc:read` Bearer |

**Endpoints:** No dedicated search endpoint found; search is via Supabase `@@ to_tsquery` in RSC query.

**Capabilities checklist:**
- ✅ `atcs.tsv` tsvector column (GIN-indexed `atcs_tsv_gin_idx`)
- ✅ `atcs_refresh_tsv` BEFORE trigger rebuilds vector on INSERT or UPDATE of `title`/`tags`
- ✅ Searches title + tags (English lexeme configuration)
- ✅ `CommandPalette` component exists (`components/layout/CommandPalette.tsx`) — likely the search entry point
- ❌ No dedicated `GET /api/v1/atcs/search?q=` REST endpoint found
- ❌ No `?q=` query parameter handling found in project page RSC

**Evidence:** `supabase/migrations/0004_atcs.sql` (`atcs_tsv_gin_idx`, `bunkai_atcs_refresh_tsv`), `components/layout/CommandPalette.tsx`
→ See `business-data-map.md` Flow 9.

---

#### FEAT-024 — ATC Create (New ATC) — Planned

| Field | Value |
|-------|-------|
| Status | **Planned** (Phase E) |
| Persona(s) | member, admin, owner |
| Auth required | Cookie session or PAT with `atc:write` |

**Endpoints:**
- `POST /api/v1/atcs` — **NOT IMPLEMENTED**

**Capabilities checklist:**
- ❌ No ATC INSERT endpoint or server action found
- ❌ "New ATC" UI button may exist but has no functional handler
- Note: `bunkai_save_atc` RPC handles EDIT only (UPDATE path) — INSERT not covered by RPC

**Evidence:** `business-data-map.md` Discovery Gap #1, `supabase/migrations/0007_save_atc.sql` (UPDATE only)

---

### Domain: Test Execution / Runs

---

#### FEAT-025 — Test Run Execution — Planned

| Field | Value |
|-------|-------|
| Status | **Planned** (Phase 2) |
| Persona(s) | CI / AI Agent (via `run:execute` PAT scope) |
| Auth required | Bearer PAT with `run:execute` scope |

**Endpoints:**
- `POST /api/v1/runs` — **NOT IMPLEMENTED**
- `POST /api/v1/runs/{id}/results` — **NOT IMPLEMENTED**

**Capabilities checklist:**
- ✅ `run:execute` PAT scope defined in `access_tokens.scopes` enum
- ✅ ATC status machine supports `running`, `pass`, `fail`, `blocked`, `skipped` states
- ❌ No `runs` or `run_results` tables in migrations
- ❌ No `/api/v1/runs` route handler
- ❌ No ATC status transition endpoint

**Evidence:** `app/qa/qa-config.ts` patScopes entry, `supabase/migrations/0008_access_tokens.sql` scopes CHECK
→ See `business-data-map.md` Flow 4.4 (ATC Status state machine).

---

### Domain: Workspace Invites

---

#### FEAT-026 — Send Workspace Invite

| Field | Value |
|-------|-------|
| Status | **Stable** |
| Persona(s) | admin, owner |
| Auth required | Cookie session (admin/owner checked via RLS) |

**Endpoints:**
- `POST /api/v1/workspaces/{id}/invites`

**UI Pages/Components:**
- `app/(app)/workspaces/[id]/members/members-client.tsx` — invite form (email + role)

**Capabilities checklist:**
- ✅ Email (valid, max 254, stored lowercase) + role (`viewer|member|admin`, default `member`)
- ✅ 32-byte raw token generated and returned in response
- ✅ SHA-256 hash stored in `workspace_invite_secrets`
- ✅ `expires_at = now() + 7 days`
- ✅ `accept_url` returned + copied to clipboard via `navigator.clipboard` in members client
- ✅ 403 for non-admin/owner callers
- ❌ No transactional email — `console.log` only in server; admin must copy URL manually
- ❌ `owner` role cannot be invited (Zod enum excludes it)

**Evidence:** `app/api/v1/workspaces/[id]/invites/route.ts` POST
**Business rules:** BR-006, BR-011, BR-014

---

#### FEAT-027 — List Pending Invites

| Field | Value |
|-------|-------|
| Status | **Stable** |
| Persona(s) | admin, owner |
| Auth required | Cookie session |

**Endpoints:**
- `GET /api/v1/workspaces/{id}/invites`

**Capabilities checklist:**
- ✅ Returns pending invites (not accepted, not revoked, not expired)
- ✅ Derived status computed client-side in `members/page.tsx:derivedStatus()`

**Evidence:** `app/api/v1/workspaces/[id]/invites/route.ts` GET, `app/(app)/workspaces/[id]/members/page.tsx`

---

#### FEAT-028 — Accept Workspace Invite

| Field | Value |
|-------|-------|
| Status | **Stable** |
| Persona(s) | Invitee (any authenticated user) |
| Auth required | Cookie session |

**Endpoints:**
- `POST /api/v1/invites/accept`

**UI Pages/Components:**
- `app/invites/accept/page.tsx` — public landing page that reads `?token=` from query params
- `app/invites/accept/accept-client.tsx` — client component that calls accept API + redirects

**Capabilities checklist:**
- ✅ Hash raw token → lookup in `workspace_invite_secrets`
- ✅ Check: `revoked_at IS NULL` → 409 "Invite has been revoked."
- ✅ Check: `accepted_at IS NULL` → 409 "Invite has already been accepted."
- ✅ Check: `expires_at > now()` → 409 "Invite has expired."
- ✅ Check: caller email matches invite email (case-insensitive) → 403
- ✅ Upsert `workspace_members` (promotes `invited` → `active` if row exists)
- ✅ Stamp `accepted_at` + `accepted_by_user_id` on invite

**Evidence:** `app/api/v1/invites/accept/route.ts`
**Business rules:** BR-006, BR-012, BR-013

---

#### FEAT-029 — Revoke / Rotate Invite Token

| Field | Value |
|-------|-------|
| Status | **Stable** |
| Persona(s) | admin, owner |
| Auth required | Cookie session |

**Endpoints:**
- `POST /api/v1/workspaces/{id}/invites/{inviteId}` — rotate (resend with fresh token + reset expiry)
- `DELETE /api/v1/workspaces/{id}/invites/{inviteId}` — revoke (sets `revoked_at`)

**Capabilities checklist:**
- ✅ Rotate: new 32-byte token generated, hash upserted in `workspace_invite_secrets`, `expires_at` reset to now+7d, `accepted_at`/`revoked_at` cleared
- ✅ Rotate: returns new raw token + `accept_url` once
- ✅ Revoke: sets `revoked_at = now()`, returns `{ok: true}`
- ✅ RLS gates both to admin/owner role

**Evidence:** `app/api/v1/workspaces/[id]/invites/[inviteId]/route.ts`

---

### Domain: Health / System

---

#### FEAT-030 — Health Endpoint

| Field | Value |
|-------|-------|
| Status | **Stable** |
| Persona(s) | Anyone (unauthenticated) |
| Auth required | None |

**Endpoints:**
- `GET /api/v1/health`

**Capabilities checklist:**
- ✅ Returns `{ok: true, service: "bunkai-tms", env: "<environment>", ts: "<ISO timestamp>"}`
- ✅ `force-dynamic` — no Next.js caching

**Evidence:** `app/api/v1/health/route.ts`

---

#### FEAT-031 — API Discovery / Version Banner

| Field | Value |
|-------|-------|
| Status | **Stable** |
| Persona(s) | Anyone |
| Auth required | None |

**Endpoints:**
- `GET /api/v1` — version banner with pointers to OpenAPI spec and Scalar docs
- `OPTIONS /api/v1` — CORS preflight

**Capabilities checklist:**
- ✅ Returns `{version: "v1", openapi: "/api/openapi", docs: "/api/docs", status: "live"}`
- ✅ OPTIONS returns CORS headers: `allow`, `access-control-allow-methods`, `access-control-allow-headers`

**Evidence:** `app/api/v1/route.ts`

---

#### FEAT-032 — OpenAPI Spec + Scalar Docs UI

| Field | Value |
|-------|-------|
| Status | **Stable** (partial — spec only covers Auth/Health/Tokens) |
| Persona(s) | Anyone |
| Auth required | None |

**Endpoints:**
- `GET /api/openapi` — OpenAPI JSON spec
- `GET /api/docs` — Scalar interactive API reference UI

**Capabilities checklist:**
- ✅ OpenAPI spec served from `public/openapi.json`
- ✅ Scalar UI at `/api/docs` (`@scalar/api-reference-react`)
- ✅ `zod-to-openapi` (`@asteasolutions/zod-to-openapi ^8.5.0`) used for schema generation
- ⚠️ Spec is **INCOMPLETE** — only Auth/Health/Tokens registered; Workspace/Invite/Me endpoints absent

**Evidence:** `app/api/openapi/route.ts`, `lib/openapi/registry.ts`, `package.json` deps

---

## 3. CRUD Matrix

All 13 entities from `domain-glossary.md`. Key: ✅ Full · ⚠️ Partial · ❌ Not available · 🚧 Planned

| Entity | Create | Read | Update | Delete | Evidence |
|--------|:------:|:----:|:------:|:------:|---------|
| `workspaces` | ✅ `POST /api/v1/workspaces` | ✅ `GET /api/v1/workspaces`, `GET /api/v1/workspaces/{id}` | ⚠️ `PATCH /api/v1/workspaces/{id}` (name only, no slug) | ❌ No endpoint | `app/api/v1/workspaces/route.ts`, `[id]/route.ts` |
| `workspace_members` | ⚠️ Created via invite accept (upsert) | ✅ RSC in members page | ❌ No suspend/reinstate endpoint found | ❌ No endpoint | `app/api/v1/invites/accept/route.ts`, `members/page.tsx` |
| `projects` | 🚧 Planned (Phase E) | ✅ RSC in projects page | 🚧 Planned | 🚧 Planned | `app/(app)/projects/page.tsx:51` |
| `modules` | 🚧 Planned (Phase E) | ✅ RSC in project + ATC pages | 🚧 Planned | 🚧 Planned | `app/(app)/projects/[projectSlug]/page.tsx` |
| `user_stories` | 🚧 Planned (Phase E) | ✅ RSC in ATC editor page | 🚧 Planned | 🚧 Planned | `app/(app)/projects/[projectSlug]/atcs/[atcId]/page.tsx` |
| `acceptance_criteria` | 🚧 Planned (Phase E) | ✅ RSC in ATC editor page | 🚧 Planned | 🚧 Planned | `app/(app)/projects/[projectSlug]/atcs/[atcId]/page.tsx` |
| `atcs` | 🚧 Planned (Phase E ATC CREATE) | ✅ RSC in project + ATC pages | ✅ `saveAtcAction` → `bunkai_save_atc` RPC | ❌ No ATC delete endpoint found | `actions.ts`, `supabase/migrations/0007_save_atc.sql` |
| `atc_steps` | ✅ Full-replace in `bunkai_save_atc` | ✅ RSC in ATC editor | ✅ Full-replace in `bunkai_save_atc` | ✅ Full-replace in `bunkai_save_atc` | `lib/supabase/rpc.ts`, migration 0007 |
| `atc_assertions` | ✅ Full-replace in `bunkai_save_atc` | ✅ RSC in ATC editor | ✅ Full-replace in `bunkai_save_atc` | ✅ Full-replace in `bunkai_save_atc` | `lib/supabase/rpc.ts`, migration 0007 |
| `atc_acceptance_criteria` | ✅ Full-replace in `bunkai_save_atc` | ✅ RSC in ATC editor | ✅ Full-replace in `bunkai_save_atc` | ✅ Full-replace in `bunkai_save_atc` | `lib/supabase/rpc.ts`, migration 0007 |
| `access_tokens` | ✅ `POST /api/v1/tokens` (also via signup/signin) | ✅ `GET /api/v1/tokens` | ❌ No update endpoint (name, scopes immutable after mint) | ✅ `DELETE /api/v1/tokens/{id}` (soft revoke) | `app/api/v1/tokens/route.ts`, `[id]/route.ts` |
| `workspace_invites` | ✅ `POST /api/v1/workspaces/{id}/invites` | ✅ `GET /api/v1/workspaces/{id}/invites` (RSC) | ⚠️ Rotate only via `POST /api/v1/workspaces/{id}/invites/{inviteId}` | ✅ `DELETE /api/v1/workspaces/{id}/invites/{inviteId}` (sets `revoked_at`) | `app/api/v1/workspaces/[id]/invites/` |
| `idempotency_keys` | ✅ Auto-inserted by `lib/api/idempotency.ts` | ❌ No read API | ✅ Status updated by idempotency middleware | ❌ No TTL cleanup (accumulates) | `lib/api/idempotency.ts`, migration 0009 |

**Summary:** 3 entities have Full CRUD (atc_steps, atc_assertions, atc_acceptance_criteria via RPC), 3 have partial (workspaces, workspace_members, access_tokens), 4 are read-only + planned mutations (projects, modules, user_stories, acceptance_criteria), 1 has no delete (atcs — delete not found), 1 is infrastructure (idempotency_keys), 1 partial-lifecycle (workspace_invites).

---

## 4. API Endpoint Inventory

Source: ALL `app/api/` route files (not just `public/openapi.json` — spec is incomplete).

### Authentication

| Method | Endpoint | Purpose | Auth | Status |
|--------|---------|---------|------|--------|
| POST | `/api/v1/auth/magic-link` | Send magic-link OTP email | None | Stable |
| GET | `/auth/callback` | Exchange OTP code for session cookie | None | Stable |
| POST | `/api/v1/auth/signup` | Headless user provision + PAT mint | None | Stable |
| POST | `/api/v1/auth/signin` | Email/password sign-in + PAT mint | None | Stable |

### User Identity

| Method | Endpoint | Purpose | Auth | Status |
|--------|---------|---------|------|--------|
| GET | `/api/v1/me` | Introspect principal: user, workspaces, active_workspace_id, auth.source+scopes | Cookie or Bearer | Stable |
| POST | `/api/v1/me/active-workspace` | Set active workspace (writes `bk_active_ws` cookie) | Cookie | Stable |

### Workspaces

| Method | Endpoint | Purpose | Auth | Status |
|--------|---------|---------|------|--------|
| POST | `/api/v1/workspaces` | Create workspace + auto-enroll caller as owner | Cookie | Stable |
| GET | `/api/v1/workspaces` | List caller's workspaces | Cookie or Bearer | Stable |
| GET | `/api/v1/workspaces/{id}` | Get workspace details | Cookie | Stable |
| PATCH | `/api/v1/workspaces/{id}` | Rename workspace (name only; owner-only via RLS) | Cookie | Stable |

### Workspace Invites

| Method | Endpoint | Purpose | Auth | Status |
|--------|---------|---------|------|--------|
| POST | `/api/v1/workspaces/{id}/invites` | Create invite (admin/owner only) | Cookie | Stable |
| GET | `/api/v1/workspaces/{id}/invites` | List workspace invites | Cookie | Stable |
| POST | `/api/v1/workspaces/{id}/invites/{inviteId}` | Rotate invite token (resend) | Cookie | Stable |
| DELETE | `/api/v1/workspaces/{id}/invites/{inviteId}` | Revoke invite | Cookie | Stable |
| POST | `/api/v1/invites/accept` | Accept invite by token | Cookie | Stable |

### Access Tokens (PAT)

| Method | Endpoint | Purpose | Auth | Status |
|--------|---------|---------|------|--------|
| POST | `/api/v1/tokens` | Mint new PAT (session required) | Cookie | Stable |
| GET | `/api/v1/tokens` | List caller's PATs (no secrets) | Cookie | Stable |
| DELETE | `/api/v1/tokens/{id}` | Soft-revoke PAT | Cookie | Stable |

### System / Meta

| Method | Endpoint | Purpose | Auth | Status |
|--------|---------|---------|------|--------|
| GET | `/api/v1` | API version banner + spec/docs pointers | None | Stable |
| OPTIONS | `/api/v1` | CORS preflight | None | Stable |
| GET | `/api/v1/health` | Liveness probe | None | Stable |
| GET | `/api/openapi` | OpenAPI spec (JSON) | None | Stable (partial) |
| GET | `/api/docs` | Scalar interactive docs UI | None | Stable (partial) |

**Total: 20 endpoints found** (vs 14 registered in `qa-config.ts` — 6 additional discovered from route files: workspace GET/PATCH, invite GET, invite rotate/revoke, OPTIONS)

---

## 5. UI Component Inventory

### Forms

| Component | Purpose | Route / File | Status |
|-----------|---------|--------------|--------|
| `MagicLinkForm` | Email input + submit for magic-link OTP | `/login` · `app/(auth)/login/magic-link-form.tsx` | Stable |
| `OnboardingForm` | Workspace name + slug creation | `/onboarding` · `app/(app)/onboarding/onboarding-form.tsx` | Stable |
| `MembersClient` invite form | Email + role selector for workspace invites | `/workspaces/{id}/members` · `members-client.tsx` | Stable |
| `AtcEditor` | Full ATC edit form (title, layer, tags, Monaco steps/assertions) | `/projects/{slug}/atcs/{id}` · `components/atcs/AtcEditor.tsx` | Stable |
| `AnchoringPanel` | Story picker + AC checkboxes (anchoring moat enforcer) | Inside `AtcEditor` · `components/atcs/AnchoringPanel.tsx` | Stable |
| `StepEditor` | Monaco Markdown editor for ATC steps | Inside `AtcEditor` · `components/atcs/StepEditor.tsx` | Stable |
| `AcceptClient` | Invite token redemption form | `/invites/accept` · `app/invites/accept/accept-client.tsx` | Stable |

### Dashboards / Views

| Component | Purpose | Route / File | Status |
|-----------|---------|--------------|--------|
| `ProjectsIndexPage` | Route hub (no membership → onboarding; has project → redirect) | `/projects` · `app/(app)/projects/page.tsx` | Stable |
| `ProjectPage` | ATC list + module tree sidebar (full project view) | `/projects/{slug}` · `app/(app)/projects/[projectSlug]/page.tsx` | Stable |
| `AtcEditorPage` | ATC detail/edit page (RSC loads all data, renders AtcEditor) | `/projects/{slug}/atcs/{id}` · `app/(app)/projects/[projectSlug]/atcs/[atcId]/page.tsx` | Stable |
| `MembersPage` | Members + invites list for workspace | `/workspaces/{id}/members` · `app/(app)/workspaces/[id]/members/page.tsx` | Stable |
| `AtcTable` | Sortable ATC data table (TanStack Table) | Inside `ProjectPage` · `components/atcs/AtcTable.tsx` | Stable |
| `Sidebar` (Explorer) | Collapsible module tree with stories + ATCs | Inside `ProjectPage` + `AtcEditorPage` · `components/layout/Sidebar.tsx` | Stable |
| `Topbar` + `Breadcrumb` | Top navigation bar with project/workspace context | `components/layout/Topbar.tsx` | Stable |
| `QA Config Page` | Developer QA reference page (stack, auth snippets, endpoints, Playwright fixtures) | `/qa` · `app/qa/page.tsx` | Stable |
| `Design Tokens Page` | Design system token reference | `/design-tokens` · `app/design-tokens/page.tsx` | Internal |
| `LoginPage` | Magic-link entry point with brand panel | `/login` · `app/(auth)/login/page.tsx` | Stable |

### Actions / Modals

| Component | Purpose | File | Status |
|-----------|---------|------|--------|
| `WorkspaceSwitcher` | Dropdown to switch active workspace (calls GET /me + POST /me/active-workspace) | `components/layout/WorkspaceSwitcher.tsx` | Stable |
| `CommandPalette` | Quick navigation / ATC search launcher | `components/layout/CommandPalette.tsx` | WIP (infrastructure present, search wiring unclear) |
| Layer chip selector | UI/API/Unit selector inside AtcEditor | Inside `AtcEditor.tsx:LAYERS` constant | Stable |
| Tag input | Enter-delimited tag entry in AtcEditor | Inside `AtcEditor.tsx` | Stable |
| Toast notifications | Success/error feedback via `sonner` | App-wide — `sonner ^2.0.7` | Stable |

---

## 6. Third-Party Integrations

| Service | Purpose | Package | Status | Features Using It |
|---------|---------|---------|--------|-------------------|
| **Supabase Auth** | Identity: magic-link OTP, email/password auth, JWT sessions, admin user creation API | `@supabase/supabase-js ^2.106.0`, `@supabase/ssr ^0.10.3` | Stable | FEAT-001, FEAT-002, FEAT-003, FEAT-004, FEAT-014 |
| **Supabase PostgreSQL 17** | Sole data store; RLS enforces multi-tenant isolation on all 19 tables | `@supabase/supabase-js ^2.106.0` | Stable | All features |
| **Vercel** | Deployment: edge middleware (session check), serverless route handlers, RSC rendering | Platform (no npm pkg) | Stable | All features |
| **Zod** | Input validation on all API endpoints + OpenAPI schema generation | `zod ^4.4.3` | Stable | All API endpoints |
| **zod-to-openapi** | Generate OpenAPI schema from Zod objects | `@asteasolutions/zod-to-openapi ^8.5.0` | Stable (partial) | FEAT-032 |
| **Scalar** | Interactive API docs UI at `/api/docs` | `@scalar/api-reference-react ^0.9.38` | Stable (partial spec) | FEAT-032 |
| **Monaco Editor** | Code editors for ATC steps (Markdown) and assertions (YAML) | `@monaco-editor/react ^4.7.0` | Stable | FEAT-022 |
| **TanStack Table** | Sortable ATC data table | `@tanstack/react-table ^8.21.3` | Stable | FEAT-021 |
| **Sonner** | Toast notifications (success/error feedback) | `sonner ^2.0.7` | Stable | All forms |
| **shadcn/ui + Radix** | Headless UI primitives (Dialog, DropdownMenu, Tabs, Tooltip) | `@radix-ui/react-*` | Stable | All UI |
| **Tailwind CSS** | Utility-first styling + design tokens | `tailwindcss ^3.4` | Stable | All UI |
| **YAML** | YAML parsing for assertion editor content | `yaml ^2.8.2` | Stable | FEAT-022 |
| **Resend (email)** | Transactional email for workspace invite delivery | Not in `package.json` (in QA boilerplate only) | **NOT WIRED** | FEAT-026 (planned) |
| **Supabase Storage** | File/attachment storage | Not referenced in `package.json` or source | **Not used** | — |

---

## 7. Feature Flags and WIP

### Env Variables (from `.env.example`)

| Variable | Purpose | Required | Status |
|----------|---------|---------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Yes | Active |
| `SUPABASE_PUBLISHABLE_KEY` | Browser-safe Supabase key (replaces legacy anon key) | Yes | Active |
| `SUPABASE_SECRET_KEY` | Server-only Supabase service-role key | Yes | Active |
| `SUPABASE_JWT_SECRET` | For custom JWT verification | Yes | Active |
| `NEXT_PUBLIC_APP_URL` | App base URL for auth redirects and email links | Yes | Active |
| `POSTGRES_*` | Direct DB connection (for raw SQL / DBHub MCP) | Optional (MCP tooling) | Active |
| `RESEND_API_KEY` | Transactional email for invite delivery | No (not yet wired in app) | Gap — see FEAT-026 |
| `ATLASSIAN_*`, `JIRA_*` | Jira/Xray integration (QA boilerplate side) | No | QA tooling only |
| `TAVILY_API_KEY` | Web search MCP | No | QA tooling only |
| `SUPABASE_ACCESS_TOKEN` | Supabase MCP (migrations/management) | No | QA tooling only |

No `FEATURE_*` or `ENABLE_*` flags found. The `feature_flags` table in the DB provides gradual rollout gating but has no API surface — managed via Supabase Studio only (MVP).

### Planned Features from Code Comments

| Signal | Type | Location | Milestone |
|--------|------|---------|-----------|
| ATC CREATE (new ATC INSERT) | Feature | `business-data-map.md` Gap #1, `supabase/migrations/0007_save_atc.sql` | Phase E |
| Project / Module / Story creation UI | Feature | `app/(app)/projects/page.tsx:51` | Phase E |
| Multi-workspace switcher | UI | `app/(app)/projects/page.tsx:9` | Phase E |
| Member suspend/reinstate endpoint | Feature | `business-data-map.md` state machine §4.1 | Phase E |
| Test run execution (`POST /api/v1/runs`) | Core feature | `app/qa/qa-config.ts` patScopes `run:execute` | Phase 2 |
| Transactional email for invites | Integration | `app/api/v1/workspaces/[id]/invites/route.ts:79` `console.log` | Phase N (unscheduled) |
| OAuth (GitHub + Google) | Auth | `app/(auth)/login/page.tsx:139,149` disabled buttons | Not scheduled |
| Rate limiting on auth endpoints | Security | `app/api/v1/auth/magic-link/route.ts` Phase F comment | Phase F |
| Jira/GitHub story sync | Integration | `user_stories.external_id` + `external_url` DB columns | Unscheduled |
| Feature flags admin UI/API | Admin | `feature_flags` table, no endpoint | Unscheduled |
| Activity log read API | Admin/Audit | `activity_log` table, service_role writes only | Unscheduled |
| Payment/plan tier gating | Business model | `workspaces.plan` field (`community`/`cloud`/`enterprise`) | Unscheduled |
| Workspace delete endpoint | Feature | Missing from API | Unscheduled |
| ATC delete endpoint | Feature | Missing from API | Unscheduled |

---

## 8. QA Relevance

### Feature Test Coverage Matrix

| Feature | Unit | Integration | E2E | QA Priority |
|---------|:----:|:-----------:|:---:|:-----------:|
| FEAT-001 Magic-link auth | ❌ | ❌ | ❌ | P0 — auth entry point |
| FEAT-002 Headless signup + PAT mint | ❌ | ❌ | ❌ | P0 — CI bootstrap path |
| FEAT-003 Headless signin + PAT mint | ❌ | ❌ | ❌ | P0 — CI re-auth path |
| FEAT-004 Session middleware | ❌ | ❌ | ❌ | P1 — route protection |
| FEAT-006 Workspace creation | ❌ | ❌ | ❌ | P0 — onboarding gate |
| FEAT-011 PAT mint | ❌ | ❌ | ❌ | P0 — headless enabler |
| FEAT-013 PAT revocation | ❌ | ❌ | ❌ | P1 |
| FEAT-014 Bearer auth verification | ❌ | ❌ | ❌ | P0 — PAT security |
| FEAT-022 ATC edit/save (anchoring moat) | ❌ | ❌ | ❌ | P0 — core product |
| FEAT-026 Workspace invite send | ❌ | ❌ | ❌ | P1 |
| FEAT-028 Workspace invite accept | ❌ | ❌ | ❌ | P1 |
| FEAT-007/008 Workspace read/update | ❌ | ❌ | ❌ | P2 |
| FEAT-017 Module tree read | ❌ | ❌ | ❌ | P2 |
| FEAT-021 ATC list view | ❌ | ❌ | ❌ | P2 |
| FEAT-023 ATC search | ❌ | ❌ | ❌ | P2 |
| FEAT-030 Health endpoint | ❌ | ❌ | ❌ | P3 |

> No automated test infrastructure found in `upex-bunkai-tms`. No `.github/workflows/`, no `playwright.config.ts`, no test files. All coverage is zero. This is a Discovery Gap.

### High-Risk Features

| Feature | Risk | Reason |
|---------|------|--------|
| FEAT-014 Bearer auth (PAT verification) | **P0 Security** | SHA-256 comparison bug was previously present (hash of `remainder` only, not full secret) — regression must be verified after any `lib/api/middleware/bearer.ts` change |
| FEAT-022 ATC save (anchoring moat) | **P0 Data integrity** | `bunkai_save_atc` full-replace semantics — save with empty `acIds` must be blocked at app layer, not just DB; viewer RLS denial must hold |
| FEAT-028 Invite accept | **P1 Auth** | Email mismatch bypass, token replay, expired token acceptance — 5 separate guard conditions |
| FEAT-001 Open-redirect (magic-link callback) | **P1 Security** | `safeNext` guard must reject `//evil.com` — only 2-line guard in `app/auth/callback/route.ts:17–19` |
| FEAT-026 Invite send (token exposure) | **P1 Confidentiality** | Raw token returned in API response + `console.log` to stdout — no email delivery means token is only as secure as the copy-paste channel |
| Multi-tenant RLS isolation (all features) | **P0 Data leakage** | Cross-workspace read as User B → expect 0 rows — no test coverage; must be first regression suite |
| FEAT-009 Member management | **P1 RBAC** | No suspend/reinstate endpoint means there is no way to remove access except revoking all tokens — gap in access control lifecycle |

---

## 9. Discovery Gaps

| # | Gap | Affected Features | Impact | Where to Investigate |
|---|-----|------------------|--------|---------------------|
| 1 | **ATC CREATE not implemented** — `bunkai_save_atc` is UPDATE-only; no INSERT endpoint or server action found | FEAT-024 | Cannot automate ATC creation; all test fixtures must pre-seed | Phase E backlog; check `app/api/v1/atcs/` (missing) |
| 2 | **Project/Module/Story CRUD absent** — no `POST /api/v1/projects|modules|user-stories` endpoints | FEAT-016, FEAT-018, FEAT-020 | Full hierarchy setup requires direct Supabase Studio access or DB seed | Phase E — no timeline found |
| 3 | **No automated test suite** — zero test files, no `playwright.config.ts`, no CI in `upex-bunkai-tms` | All features | No regression safety net; every change is manually tested | Gap in target repo — out of scope for QA engineering repo |
| 4 | **`run:execute` scope has no endpoint** — PAT scope exists, ATC status machine supports execution states, but `POST /api/v1/runs` and `runs` table absent | FEAT-025 | Core product loop (author → execute → report) is incomplete | Phase 2 roadmap |
| 5 | **Transactional email not wired** — invite `accept_url` only available via API response + server `console.log` | FEAT-026 | Invite E2E automation is blocked; admin must manually extract URL from API response | `app/api/v1/workspaces/[id]/invites/route.ts:79` + Resend integration needed |
| 6 | **`CommandPalette` ATC search wiring unclear** — component exists but search query dispatch to DB query path not confirmed | FEAT-023 | Cannot test search E2E without verifying component actually queries `atcs.tsv` | Read `components/layout/CommandPalette.tsx` in full |
| 7 | **No member suspend/reinstate endpoint** — `workspace_members.status='suspended'` is DB-defined but no API endpoint found | FEAT-009 | No programmatic way to revoke team member access (only workaround: revoke all their PATs) | Search `app/api/v1/workspaces/[id]/members/` (missing) |
| 8 | **ATC delete endpoint absent** — no `DELETE /api/v1/atcs/{id}` route found | FEAT-022 | Cannot delete ATCs from UI/API; only possible via direct DB access | Phase E gap |
| 9 | **Workspace delete endpoint absent** — no `DELETE /api/v1/workspaces/{id}` | FEAT-008 | Owners cannot delete workspaces | Unscheduled |
| 10 | **Feature flags have no API** — `feature_flags` table (`global`/`workspace` scope) exists but no read/write endpoint | — | Cannot test feature-flag-gated paths without direct DB manipulation | Managed via Supabase Studio — `supabase/migrations/0009_cross_cutting.sql` |
| 11 | **Activity log read API absent** — `activity_log` service_role-write-only, no read endpoint | — | Audit trail not accessible to workspace members or QA | No confirmed plan |
| 12 | **PAT workspace-scope enforcement unverified** — `access_tokens.workspace_id` allows scoped token but no handler code confirmed to reject workspace mismatch | FEAT-014 | Potential cross-workspace privilege escalation | Read `lib/api/middleware/bearer.ts` BearerContext usage in workspace routes |
| 13 | **No HTTP security headers** — `next.config.ts` has no `headers()` function; CSP, HSTS, X-Frame-Options absent | All browser features | XSS/clickjacking surface; NFR-SEC gap | Add `headers()` to `next.config.ts` |
| 14 | **OpenAPI spec incomplete** — `public/openapi.json` only covers Auth/Health/Tokens; Workspace/Invite/Me/ATC endpoints not registered | FEAT-032 | Scalar docs mislead API consumers; MCP openapi server has partial surface | `lib/openapi/registry.ts` — extend registrations |
| 15 | **No TTL cleanup for `idempotency_keys`** (24h) and `magic_link_tokens` — rows accumulate indefinitely | — | DB bloat over time | Add `pg_cron` or Supabase Edge Function scheduled job |
| 16 | **`user_view_state` write path unconfirmed** — table exists but no component confirmed to write `view_kind` values; valid values unknown (no CHECK constraint) | — | Cannot test UI state persistence | Search for `user_view_state` writes in `components/layout/Sidebar.tsx` or project page |

---

*Owned by: `/business-feature-map` command. Companion: `business-data-map.md` (flows/state machines) · `domain-glossary.md` (entity definitions). Next: run `/business-api-map` for auth model deep-dive and endpoint security analysis, then `/master-test-plan` for risk-ranked test roadmap.*
