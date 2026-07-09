# BUNKAI TMS — MASTER TEST PLAN

> Generated: 2026-06-06
> Scope: MVP (Stable & WIP features in `business-feature-map.md`)
> Audience: QA engineers onboarding to test this product
> Companion: `business-data-map.md` (flows/state machines) · `business-feature-map.md` (feature catalog) · `domain-glossary.md` (entity definitions)

---

## EXECUTIVE SUMMARY

Bunkai TMS is a test management system built on **multi-tenant RLS isolation, mandatory AC anchoring for every ATC, and three PAT scopes for headless access**. The product is **67% feature-complete** (24 stable + 2 WIP features; 6 planned for Phase E+). Testing priorities flip standard: **auth/authorization/multi-tenancy are P0** — the three layers that protect data — while feature CRUD is P2 (Phase E). The biggest gap is **no test automation infrastructure** in the target repo — zero test files, no `playwright.config.ts`, no CI/CD.

**What you're really testing**: Can users be isolated from each other? Can ATCs be saved atomically without breaking anchoring to ACs? Can headless CI agents bootstrap with one API call and use scoped PATs without crossing workspace boundaries?

---

## 1. RISK RUBRIC

### Scoring Matrix: Priority = (Business Impact × Breakage Likelihood × Blast Radius)

| Factor | Definition | Scale |
|--------|-----------|-------|
| **Business Impact** | Revenue loss, legal/compliance, user trust, data loss | 1=trivial, 3=moderate, 5=critical |
| **Breakage Likelihood** | Code complexity, test coverage, cross-layer dependencies | 1=low, 3=medium, 5=high |
| **Blast Radius** | Workspaces affected (1 user, all users, payment tier) | 1=isolated, 3=workspace-wide, 5=platform |

### Risk Score Bands

| Band | Score Range | Action |
|------|-------------|--------|
| **CRITICAL** | 75–125 | Must test before any release; blocking P0 gates |
| **HIGH** | 40–74 | Sprint must include regression suite; P1 automation |
| **MEDIUM** | 20–39 | Coverage planned; P2 automation track |
| **LOW** | <20 | Coverage if time permits; exploratory OK |

---

## 2. CRITICAL FLOWS (P0 — Blocking)

### CRITICAL-001: Multi-Tenant RLS Isolation

**What it does:** User A in workspace X reads zero rows from workspace Y even though rows exist. RLS policies filter at the DB layer.

**Why it matters:** Data breach. If isolation breaks, User A sees User B's test cases, ACs, workflows. Revenue risk: enterprise mandate, legal liability.

**Breakage likelihood:** HIGH — RLS involves 19 tables, 5 RLS helper functions (bunkai_is_workspace_member, bunkai_can_write_workspace, etc.), and Supabase auth integration. One broken policy is a cascading failure.

**Score:** 5 × 5 × 5 = **125 CRITICAL**

**Test scenarios:**
1. User A in WS-X tries `SELECT * FROM atcs` as anon client → RLS denies → 0 rows (not 403, not error; silent zero)
2. User A in WS-X switches to WS-Y (via cookie), tries same query → RLS filters by WS-Y membership → different 0 rows (no bleed)
3. Admin/owner user A tries to query workspace_members for WS-Y (where they're not member) → 0 rows
4. PAT scoped to WS-X tries to read ATCs from WS-Y via Bearer auth (manual workspace_id filter in handler) → 403 or 0 rows (handler must enforce scope)

**Test data needed:**
- 2 workspaces (WS-X, WS-Y)
- 2 users (A in X; B in Y)
- ≥1 ATC per workspace with distinct titles (e.g., "ATC-X-login", "ATC-Y-signup")

**Pass criteria:**
- User A sees only ATC-X-* when querying WS-X
- User A sees zero ATCs when querying WS-Y (or via PAT scoped to WS-Y)
- User B sees only ATC-Y-* when querying WS-Y

**Code hotspots:** `supabase/migrations/0002_*.sql`, `supabase/migrations/0005_rls_helpers.sql`, all `atcs_select_*` policies.

---

### CRITICAL-002: ATC Anchoring Moat (Mandatory AC Link)

**What it does:** An ATC cannot be saved without ≥1 acceptance criteria anchored to it.

**Why it matters:** Core product value. Without AC links, test traceability is broken. A feature ships untested because no one realizes an ATC exists but is orphaned.

**Breakage likelihood:** HIGH — enforced in 3 places: app layer (client validation), app layer (server action validation), RPC (`bunkai_save_atc`). Bypass anywhere = silent failure.

**Score:** 5 × 4 × 3 = **60 HIGH**

**Test scenarios:**
1. User clicks Save on ATC with title="Login flow" but no AC selected
   - Client toast blocks save: "Please anchor to at least 1 AC"
2. User selects AC, saves, then manually clears AcIds array in dev tools (client-side bypass)
   - Server action validation catches empty `acIds` → 400 + toast
3. User crafts direct `bunkai_save_atc` RPC call with `p_ac_ids = '{}'` (empty array)
   - RPC INSERT into `atc_acceptance_criteria` is a no-op (no rows inserted); subsequent SELECT sees zero ACs anchored
   - APP-LAYER CATCH: ATC should not be returned or should be marked as "unanchored" on next fetch
4. User submits valid save (ATC + 1 AC), then manually deletes the AC from the DB
   - Next fetch: ATC shows 0 ACs anchored; can re-anchor to a different AC

**Test data needed:**
- 1 user story with ≥3 acceptance criteria
- 1 ATC (initially unanchored)

**Pass criteria:**
- Save blocked at client + server if `acIds.length === 0`
- RPC call with empty `p_ac_ids` is accepted (idempotent), but next SELECT sees zero ACs
- If all ACs are deleted after anchoring, ATC still exists but shows unanchored state

**Code hotspots:** `app/(app)/projects/[projectSlug]/atcs/[atcId]/actions.ts` (server action), `components/atcs/AnchoringPanel.tsx` (client validation), `supabase/migrations/0007_save_atc.sql` (RPC INSERT on `atc_acceptance_criteria`).

---

### CRITICAL-003: Bearer PAT Authentication (Token Verification)

**What it does:** CI agent sends `Authorization: Bearer bk_pat_xxx.yyy` → API verifies token is valid (not revoked, not expired, not forged) in O(1) time with constant-time hash comparison.

**Why it matters:** Headless access is core to product positioning (automation-first). Broken auth = either denial of service (legit agents rejected) or security breach (forged tokens accepted).

**Breakage likelihood:** HIGH — token verification is security-critical. Known risk from code comments: "SHA-256 comparison bug was previously present" (hash of remainder only, not full secret). Regression is plausible.

**Score:** 5 × 5 × 5 = **125 CRITICAL**

**Test scenarios:**
1. Valid PAT generated at signup → Bearer call with that PAT succeeds (200)
2. PAT revoked via DELETE → Bearer call returns 401 (uniform, no detail leak)
3. PAT with custom expiry (expires_in_days=1) → After 1 day, Bearer call returns 401
4. Forged token (wrong secret, same prefix) → 401 (hash mismatch)
5. Token prefix extraction: `bk_pat_` + first 12 chars = indexed lookup; remainder hashed
   - Verify: if remainder is tampered, hash fails (constant-time comparison)
6. Multiple candidates scenario: Token prefix matches ≤5 rows in `access_tokens` → all candidates checked via hash comparison
7. Scope enforcement: PAT with `atc:read` only tries to call `POST /api/v1/atcs` (write endpoint) → 403 "Token missing required scope"
8. Workspace-scoped PAT: Token minted with `workspace_id = WS-X` → tries to read ATCs from WS-Y
   - Verify handler enforces `BearerContext.workspaceId === requestedWorkspace` (if applicable)

**Test data needed:**
- 1 CI agent email (e.g., ci-test@bunkai.dev)
- Multiple PATs with different scopes/expiries

**Pass criteria:**
- Valid token returns 200 + BearerContext{userId, workspaceId, scopes}
- Revoked/expired/forged token returns 401 (no detail)
- Scope mismatch returns 403 (scope name leaked)
- Constant-time hash comparison confirmed (no timing attacks)

**Code hotspots:** `lib/api/middleware/bearer.ts` (requireBearerToken), `lib/api/pat.ts` (mintPat), `app/api/v1/tokens/route.ts` (DELETE handler for revoke), `supabase/migrations/0008_access_tokens.sql`, `supabase/migrations/0011_split_token_secrets.sql` (SHA-256 isolation).

---

### CRITICAL-004: Workspace Member RBAC (Role Hierarchy & Mutation Enforcement)

**What it does:** A `viewer` role cannot create/edit/delete ATCs. An `admin` role can invite; an `owner` can invite+rename. RLS policies check role on every mutation.

**Why it matters:** Security. If role checks are bypassed, any team member can edit others' tests or delete critical test cases.

**Breakage likelihood:** MEDIUM-HIGH — role checks are in RLS policies + middleware. Main risk: RLS policy on a new endpoint is forgotten.

**Score:** 5 × 3 × 3 = **45 HIGH**

**Test scenarios:**
1. Invite 3 users as `viewer`, `member`, `admin`; one remains `owner`
2. Viewer logs in, tries to access `/projects/{slug}/atcs/{id}` (edit page)
   - Should redirect to login or show read-only view (confirm expected behavior)
3. Viewer tries `POST /api/v1/workspaces/{id}/invites` (send invite)
   - RLS policy blocks → 0 rows inserted → 403 or empty response
4. Member tries to create/edit/delete ATC
   - Member should be able to edit (can_write_workspace allows ≥member)
   - Admin should be able to invite (is_workspace_admin checks admin/owner)
5. Owner tries to rename workspace via `PATCH /api/v1/workspaces/{id}`
   - Owner role allowed; admin role denied (owner-only check)
6. Suspended member tries any mutation
   - Status='suspended' check in RLS denies all access

**Test data needed:**
- 1 workspace with 4 users (owner, admin, member, viewer)
- 1 ATC + project

**Pass criteria:**
- Viewer cannot edit ATC, invite members, or rename workspace
- Member can edit ATC, cannot invite members or rename workspace
- Admin can invite members, cannot rename workspace
- Owner can invite, rename, edit ATC
- Suspended member sees zero data + zero mutations allowed

**Code hotspots:** `supabase/migrations/0005_rls_helpers.sql` (bunkai_can_write_workspace, bunkai_is_workspace_admin, bunkai_is_workspace_owner), all workspace-scoped table RLS policies, `lib/api/middleware/bearer.ts` scope checks.

---

## 3. HIGH FLOWS (P1 — Regression Suite)

### HIGH-001: Workspace Invite Lifecycle (Send → Accept → Revoke)

**What it does:** Admin sends invite (raw token returned once), invitee accepts within 7 days and matching email, invite becomes single-use, can be revoked.

**Why it matters:** Team onboarding. If invites leak tokens or allow replay, unauthorized team members gain access.

**Breakage likelihood:** MEDIUM — 5 separate guard conditions (expiry, revocation, single-use, email match, not-yet-accepted) all need to hold.

**Score:** 4 × 3 × 3 = **36 HIGH**

**Test scenarios:**
1. Admin sends invite (email=alice@example.com, role=member)
   - API returns raw token, hash stored in workspace_invite_secrets
2. Alice accepts within 7 days with matching email
   - workspace_members upserted, invite marked accepted_at, invite becomes single-use
3. Alice tries to accept again with same token
   - Returns 409 "Invite has already been accepted"
4. Admin revokes invite
   - Returns {ok: true}, invite.revoked_at is set
5. Eve (malicious) tries to accept with Alice's token
   - Returns 403 "Invite email mismatch" (Eve's email ≠ alice@example.com)
6. Admin rotates invite (resend button)
   - New token generated, old token immediately invalid, expires_at reset to now+7d
7. Invite expires (7 days pass, time travel in test)
   - Eve tries to accept → 409 "Invite has expired"

**Test data needed:**
- 1 admin user + 1 invitee email
- System time control (or skip expiry test, mark as discovered gap)

**Pass criteria:**
- Single-use enforced: second accept fails
- Email mismatch rejected
- Revoked/expired invites fail gracefully (409, no detail leak)
- Token rotation invalidates old token immediately
- workspace_members row is created/promoted on accept

**Code hotspots:** `app/api/v1/workspaces/[id]/invites/route.ts` (POST, GET, DELETE), `app/api/v1/workspaces/[id]/invites/[inviteId]/route.ts` (POST rotate), `app/api/v1/invites/accept/route.ts`, `supabase/migrations/0010_workspace_invites.sql`, `supabase/migrations/0011_split_token_secrets.sql`.

---

### HIGH-002: Magic-Link Authentication (OTP → Session Cookie)

**What it does:** User submits email → Supabase sends OTP → User clicks link with code → Session cookie set, user can access protected routes.

**Why it matters:** Auth entry point. Broken magic-link = no one can log in.

**Breakage likelihood:** MEDIUM — depends on Supabase integration + session middleware. Open-redirect guard is a critical 2-line gate.

**Score:** 5 × 2 × 2 = **20 MEDIUM** (but **40 with open-redirect**) → **HIGH**

**Test scenarios:**
1. Submit email → API calls `signInWithOtp` → 200 {ok: true}
2. User checks inbox, clicks magic-link in email
   - Link format: `/auth/callback?code=xxx&next=/projects`
3. `/auth/callback` exchanges code → session cookie set → redirect to `/projects`
4. User can now access protected routes (no 401)
5. **SECURITY**: Malicious link `/auth/callback?code=xxx&next=//evil.com`
   - safeNext guard rejects `//evil.com` (must not start with //) → redirect to `/projects` (default safe next)
6. Case sensitivity: Email signup as Alice@Example.Com, click link, email in magic_link_tokens is lowercase
   - Verify issuance audit logs normalize email

**Test data needed:**
- Fresh email (or test inbox service)
- Test Supabase auth configured in target repo

**Pass criteria:**
- OTP email delivered (SMTP working)
- Code exchange succeeds, session cookie set
- Protected routes now accessible
- Open-redirect attempts redirected to `/projects`
- Email normalized in audit logs

**Code hotspots:** `app/api/v1/auth/magic-link/route.ts`, `app/auth/callback/route.ts` (safeNext validation), `middleware.ts` (session check), `supabase/migrations/0001_auth.sql` (magic_link_tokens insert).

---

### HIGH-003: Headless Signup + PAT Mint (One-Round-Trip Provisioning)

**What it does:** CI agent POSTs `{email, password, pat_scopes}` → User created, signed in, PAT minted, all in response (one call).

**Why it matters:** Automation enabler. If signup is slow (>3 calls) or PAT is not returned, CI pipeline onboarding is painful.

**Breakage likelihood:** MEDIUM — edge case: email already exists → must handle idempotently or return 409 Conflict.

**Score:** 4 × 2 × 3 = **24 MEDIUM**

**Test scenarios:**
1. POST `/api/v1/auth/signup` with fresh email + password + pat_scopes=['atc:read']
   - Returns {user, session, pat: {token: 'bk_pat_xxx.yyy', scopes: ['atc:read']}}
2. Response includes warning: "Store the PAT token now — it cannot be retrieved later"
3. Store token, then try `GET /api/v1/me` with Bearer token
   - Returns 200 with BearerContext
4. Try POST again with same email
   - Returns 409 Conflict (email already exists)
5. Fall back to signin: `POST /api/v1/auth/signin {email, password, pat_scopes}`
   - Signs in, mints fresh PAT (old token still valid unless revoked)

**Test data needed:**
- Unique CI agent email per test run
- Secure password

**Pass criteria:**
- Signup succeeds once, returns PAT
- Second signup same email returns 409
- Bearer auth with returned PAT succeeds
- Signin + PAT mint also works

**Code hotspots:** `app/api/v1/auth/signup/route.ts`, `app/api/v1/auth/signin/route.ts`, `lib/api/pat.ts` (mintPat).

---

### HIGH-004: ATC Save (atomic bunkai_save_atc RPC)

**What it does:** Editor saves title, layer, tags, steps, assertions, and AC links in one RPC call. All-or-nothing: if any child INSERT fails, whole save rolls back.

**Why it matters:** Data consistency. If save is not atomic, stale steps or broken AC links are possible.

**Breakage likelihood:** MEDIUM — RPC is transaction-wrapped, but full-replace semantics (DELETE all children, INSERT new) is prone to off-by-one errors.

**Score:** 4 × 3 × 3 = **36 HIGH**

**Test scenarios:**
1. Create ATC with 3 steps + 2 assertions, anchor to 1 AC
   - Save succeeds, version=1, all children persisted
2. Edit: change title, add 4th step, remove 1 assertion, anchor to 2 ACs
   - Save succeeds, version=2, old step 3 gone, assertion count is 1, AC count is 2
3. Position ordering: steps [1st, 2nd, 3rd] → reorder to [3rd, 1st, 2nd]
   - Save succeeds, next fetch shows reordered steps
4. Full-replace semantics: save with same AC IDs (no change)
   - RPC DELETEs all atc_acceptance_criteria rows, then re-INSERTs → same result
5. Viewer role tries to save
   - RLS denies UPDATE → returns 403 or 0 rows
6. RPC fails mid-transaction (simulate via corrupt JSONB)
   - Save aborts, ATC reverts to pre-save state, version does not increment

**Test data needed:**
- 1 ATC with steps, assertions, ACs
- 1 viewer role user (for RBAC test)

**Pass criteria:**
- Atomic save succeeds, version increments, all children updated
- Full-replace semantics verified (old children gone, new ones present)
- Position ordering preserved
- Viewer cannot save (RLS blocks)
- Partial failure rolls back (all-or-nothing)

**Code hotspots:** `app/(app)/projects/[projectSlug]/atcs/[atcId]/actions.ts` (saveAtcAction), `lib/supabase/rpc.ts` (bunkai_save_atc call), `supabase/migrations/0007_save_atc.sql` (RPC definition + triggers).

---

### HIGH-005: PAT Revocation (Soft Delete + Immediate Effect)

**What it does:** Owner calls `DELETE /api/v1/tokens/{id}` → PAT soft-revoked (revoked_at set) → Next Bearer call fails.

**Why it matters:** Access control. If revocation doesn't propagate, revoked agent still has access.

**Breakage likelihood:** LOW-MEDIUM — revocation is a simple UPDATE, but timing (fire-and-forget touchLastUsed async) might race.

**Score:** 3 × 2 × 3 = **18 LOW-MEDIUM**

**Test scenarios:**
1. CI agent has valid PAT
2. Admin revokes via DELETE → 204 No Content, revoked_at is set
3. Next Bearer call with same PAT → 401 (uniform, no detail)
4. Admin can still list PATs (`GET /api/v1/tokens`), sees revoked_at set, token_prefix visible
5. Secret (hash) never returned in list response

**Test data needed:**
- 1 PAT + 1 admin user

**Pass criteria:**
- DELETE returns 204, revoked_at set in DB
- Bearer auth fails immediately after revocation
- List response shows revoked_at but never returns raw secret

**Code hotspots:** `app/api/v1/tokens/[id]/route.ts` (DELETE), `lib/api/middleware/bearer.ts` (revoked_at IS NULL check).

---

## 4. MEDIUM FLOWS (P2 — Sprint Backlog)

### MEDIUM-001: Workspace Creation + Auto-Enrollment

Admin bootstrap gate. User signs in, sees no workspace, creates one, becomes owner. Must validate slug format/uniqueness.

**Score:** 3 × 2 × 2 = **12 LOW** (but critical path, so P2)

**Test scenarios:**
- Slug 3–40 chars, lowercase alphanumeric + hyphens, no leading/trailing hyphen
- Slug collision → 409 SQLSTATE 23505
- Caller auto-enrolled as owner
- Default plan='community'

---

### MEDIUM-002: PAT Listing & Metadata

Non-secret introspection. Owner sees PAT metadata (scopes, expiry, last_used_at) without leaking secret.

**Score:** 2 × 1 × 1 = **2 LOW**

**Test scenarios:**
- GET returns id, name, scopes, expires_at, last_used_at, created_at
- Raw secret never returned
- Order by created_at descending

---

### MEDIUM-003: ATC Full-Text Search (tsv + GIN Index)

Search by title/tags. GIN index on tsvector for fast lookup.

**Score:** 2 × 2 × 2 = **8 LOW**

**Test scenarios:**
- Search "login magic" returns ATCs with those words in title or tags
- `atcs_refresh_tsv` trigger rebuilds tsvector on title/tags UPDATE
- GIN index `atcs_tsv_gin_idx` exists and is used

---

### MEDIUM-004: ATC List View & Sorting

Table displays all ATCs in project, sortable by title/layer/status.

**Score:** 2 × 1 × 1 = **2 LOW**

**Test scenarios:**
- TanStack Table sorting by all visible columns
- Layer chip color-coding (UI/API/Unit)
- Status badge (unrun/running/pass/fail/blocked/skipped)

---

## 5. SILENT KILLERS (Infrastructure Gaps — May Block Tests)

### SK-001: No ATC CREATE Endpoint

**Status:** Planned (Phase E)
**Impact:** Test fixtures must pre-seed ATCs via direct Supabase Studio insert or migrations; cannot test "create new ATC" flow

**Mitigation:** Use Supabase Admin API to pre-seed fixtures, or mark as "unable to test until Phase E"

---

### SK-002: No Project/Module/Story CRUD API

**Status:** Planned (Phase E)
**Impact:** Full hierarchy setup requires direct DB access; cannot test "create project from scratch" flow

**Mitigation:** Pre-seed hierarchy in DB per test run; no E2E creation testing

---

### SK-003: No Test Run Execution Endpoint (`POST /api/v1/runs`)

**Status:** Planned (Phase 2)
**Impact:** Core loop (author → execute → report) is incomplete; cannot test execution state transitions

**Mitigation:** Skip execution testing; focus on authoring + PAT access. Mark as Phase 2 gap

---

### SK-004: No Transactional Email for Invites

**Status:** Not wired (MVP — console.log only)
**Impact:** Invite E2E automation blocked; token only available via API response + server logs

**Mitigation:** Extract token from API response + clipboard (no email mock). Or mock Resend (Phase N integration gap)

---

### SK-005: No CI/CD Pipeline in Target Repo

**Status:** Missing `.github/workflows/`
**Impact:** No automated regression on push; all testing is manual or via external agent

**Mitigation:** Regression suite must run as standalone GA workflow or manual invocation; out of scope for this QA repo

---

### SK-006: No HTTP Security Headers (CSP, HSTS, X-Frame-Options)

**Status:** Missing `headers()` function in `next.config.ts`
**Impact:** NFR-SEC gap; XSS/clickjacking surface not tested

**Mitigation:** Flag as discovered gap; add headers() before any security-sensitive release

---

## 6. EXTERNAL INTEGRATIONS — Test Hazards

### INT-001: Supabase Auth (Magic-Link SMTP)

**Hazard:** SMTP delivery flaky or rate-limited. Test email may not arrive within timeout.

**Mitigation:** Use deterministic auth (magic-link code in test fixtures, or mock Supabase auth for unit tests). OR use Supabase test email API (if available).

---

### INT-002: Supabase RLS Evaluation at Query Time

**Hazard:** RLS policies are evaluated per-query; cached query results may not respect new memberships.

**Mitigation:** Always clear any client-side caches after membership changes. Verify RLS in separate query post-change.

---

## 7. CROSS-WORKSPACE PERMISSION BOUNDARY (Risk Surface)

### Scenario: User A + Workspace X, User B + Workspace Y

| Flow | Expected | Risk |
|------|----------|------|
| User A queries workspace_members for WS-Y | 0 rows (RLS filters) | If RLS is bypassed, User A sees all team members of WS-Y |
| User A via PAT scoped to WS-X tries to read ATCs from WS-Y | 403 or 0 rows (handler checks workspace_id match) | If handler forgets scope check, cross-workspace read succeeds |
| User A updates workspace name for WS-Y | 403 or 0 rows (RLS owner-only) | If RLS is bypassed, User A can rename WS-Y |
| User A invites email to WS-Y | 403 (RLS admin-only) | If RLS is bypassed, User A sends invites on behalf of WS-Y |

**Master test:** Create 2 workspaces + 2 disjoint users. Have User A attempt every query/mutation that should fail due to RLS. Expect zero rows or 403, never a data leak.

---

## 8. PRE-RELEASE CHECKLIST (15 Items)

Before shipping Bunkai to production / next milestone:

- [ ] **P0-SEC-001**: Multi-tenant RLS isolation verified on all 19 tables (User A in WS-X cannot read WS-Y data)
- [ ] **P0-AUTH-001**: Bearer token verification is constant-time (no timing leak on hash comparison)
- [ ] **P0-AUTH-002**: PAT scopes enforced at API layer (atc:read token cannot atc:write)
- [ ] **P0-AUTH-003**: Workspace-scoped PAT cannot read other workspaces (BearerContext.workspaceId matched)
- [ ] **P0-AUTHN-001**: Magic-link open-redirect guard prevents `/auth/callback?next=//evil.com`
- [ ] **P1-FEATURE-001**: ATC anchoring moat holds: no ATC saved without ≥1 AC (client + server + RPC)
- [ ] **P1-FEATURE-002**: ATC save is atomic: partial failure rolls back all changes
- [ ] **P1-RBAC-001**: Viewer role cannot edit/invite (RLS blocks mutations)
- [ ] **P1-RBAC-002**: Admin can invite, owner can rename (role hierarchy enforced)
- [ ] **P1-ONBOARD-001**: Workspace invite single-use and email-matched (no token replay, no email bypass)
- [ ] **P1-ONBOARD-002**: Invite expires in 7 days (accept after expiry fails)
- [ ] **P2-API-001**: PAT listing never returns raw secret or hash
- [ ] **P2-API-002**: All error responses are uniform (no info leak, e.g., 401 doesn't distinguish "token not found" vs. "hash mismatch")
- [ ] **P2-DB-001**: idempotency_keys don't accumulate indefinitely (24h TTL cleanup running or planned)
- [ ] **P3-INFRA-001**: HTTP security headers (CSP, HSTS, X-Frame-Options) present in next.config.ts

---

## 9. WHAT IS NOT IN THIS PLAN

### Planned for Phase E (Not Tested Until Implemented)

- ATC CREATE flow (INSERT, not UPDATE-only)
- Project/Module/Story CRUD UI
- Member suspend/reinstate endpoints
- ATC delete endpoint
- Workspace delete endpoint

### Planned for Phase 2 (Not Tested Until Implemented)

- Test Run Execution (`POST /api/v1/runs` + status transitions)

### Planned for Phase N (Unscheduled — Lower Priority)

- Transactional email delivery (Resend integration)
- Jira/GitHub story sync (external_id linking)
- Feature flags admin API
- Activity log read API
- OAuth (GitHub/Google)
- Rate limiting on auth endpoints

### Out of Scope for This Test Plan

- **Unit tests** (component logic, utility functions) — covered by feature team's testing; this plan is integration+E2E
- **Load / stress testing** — Vercel auto-scaling; no baseline SLA defined
- **Accessibility (a11y)** — Design system owns; QA can spot-check but no automated axe-core suite planned
- **i18n (internationalization)** — Product is English-only MVP
- **Mobile browsers** — Responsive CSS is tested manually; no Playwright mobile emulation suite

---

## 10. DISCOVERY GAPS (Honest Gaps in Understanding)

| # | Gap | Impact | Next Step |
|---|-----|--------|-----------|
| **D-001** | **No test infrastructure exists** — zero test files in target repo, no `playwright.config.ts`, no CI/CD | Cannot run regression suite; all testing is manual | This QA repo must provide Playwright fixtures + CI workflow |
| **D-002** | **CommandPalette ATC search wiring unclear** — component exists but actual DB query dispatch not confirmed | Cannot verify search E2E without reading full component code | Read `components/layout/CommandPalette.tsx` in full |
| **D-003** | **`user_view_state` write path unconfirmed** — table exists but component ownership unclear | Cannot test UI persistence without finding write location | Search `grep -r user_view_state` in components/ |
| **D-004** | **PAT workspace-scope enforcement unverified** — `access_tokens.workspace_id` column exists but handler code not all verified | Risk: cross-workspace PAT read possible | Audit all workspace-specific route handlers for BearerContext.workspaceId match |
| **D-005** | **Idempotency key actual enforcement unclear** — `lib/api/idempotency.ts` exists but not all route handlers confirmed to use it | Potential double-create risk | Grep all POST handlers for idempotency middleware |
| **D-006** | **Session middleware edge cases** — `safeNext` guard is 2 lines; no test for all redirect bypass vectors | Possible open-redirect variance | Test: `/`, `/admin`, `/?evil=com`, `/..%2fadmin`, `//%2f/admin` |
| **D-007** | **RLS policy on workspace_members self-reference** — uses `bunkai_is_workspace_member` SECURITY DEFINER to prevent 42P17 recursion, but recursion risk not proven | If SECURITY DEFINER fails, infinite loop possible | Load `supabase/migrations/0005_rls_helpers.sql`, verify SECURITY DEFINER + STABLE on bunkai_is_workspace_member |
| **D-008** | **ATC status transitions untestable** — `run:execute` scope exists but no `/api/v1/runs` endpoint; status machine defined but unreachable | Cannot verify state machine works | Blocked on Phase 2 implementation |
| **D-009** | **Feature flags enforcement** — `feature_flags` table exists but no read/write endpoint; no feature-flag checks found in route handlers | Cannot test flag-gated paths | Search for FF checks; if none found, feature-flag infra is placeholder |

---

## 11. NEXT STEPS

**This plan is the living registry. Update it as:**
1. Phases E/2 ship (re-prioritize, add new test scenarios)
2. Security review reveals new surfaces (add CRITICAL flows)
3. Test execution discovers bugs (add regression items under each flow)
4. New integration surfaces (Resend, Jira, etc. — add to INT section)

**Handoff to testing team:**
- Create Playwright spec files per flow (organized by `P0-*` / `P1-*` / `P2-*` folder structure)
- Each spec has 3-5 test cases from scenarios above
- Use fixtures (pre-seeded workspaces, users, ATCs) to make tests independent
- Run pre-release checklist before any release milestone

**Sync with team:**
- Align on which testing phases run in which sprints
- Confirm env setup (test Supabase project, test auth email, DBHub access)
- Establish regression baseline after P0 tests pass

---

*Owned by: `/master-test-plan` command. Upstream: `business-data-map.md`, `business-feature-map.md`. Downstream: `/test-automation` (Playwright implementation).*
