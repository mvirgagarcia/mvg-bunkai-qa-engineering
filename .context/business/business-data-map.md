+---------------------------------------------------------------+
|           BUNKAI TMS — BUSINESS DATA MAP                      |
|   AI-native Test Management System for QA Engineers           |
|   Generated: 2026-05-31  |  Source: supabase/migrations 0001–0012  |
+---------------------------------------------------------------+

> Companion docs: `domain-glossary.md` (entity reference) · `business-model.md` (canvas) · `SRS/architecture.md` (technical layers)
> Do NOT add API endpoint catalogs here — that lives in `business-api-map.md`. Do NOT add test plans — that lives in `master-test-plan.md`.

---

## 1. Executive Summary

Bunkai (分解 — "decomposition/analysis") is a test management system purpose-built for QA teams who need to trace every test case back to the business intent that justifies it. The core insight driving the product is that in most TMS tools, the link between a test case and the requirement it validates is optional — and optional means it gets skipped under sprint pressure. Bunkai makes that link structurally mandatory: an Acceptance Test Case (ATC) cannot be saved without referencing at least one Acceptance Criterion. No AC anchor, no save.

The product targets multi-tenant QA organizations — independent teams sharing the same platform, isolated by workspace, with fine-grained RBAC (viewer / member / admin / owner). It supports three test-case classification layers (UI, API, Unit) that map directly to automation stacks. GIN-indexed full-text search scales ATC discovery to large suites. Personal Access Tokens (PATs) with scoped permissions (`atc:read`, `atc:write`, `run:execute`, `workspace:admin`) allow CI pipelines and AI agents to read and write ATCs headlessly, making Bunkai automation-first by design.

The platform runs as a Next.js 15 monorepo on Vercel with Supabase Postgres 17 as the data and auth layer. Row-Level Security enforces tenant isolation at the database layer — every query is filtered to the caller's workspace membership without application-layer enforcement. Auth is magic-link first (passwordless OTP for humans); headless agents bootstrap with email/password via a provisioning endpoint and receive a PAT in the same response.

### Main Actors

```
+--------------------+   +--------------------+   +--------------------+
|   QA Engineer /    |   |   Workspace Admin  |   |   CI / AI Agent    |
|   Team Lead        |   |   / Owner          |   |   (Headless)       |
+--------------------+   +--------------------+   +--------------------+
| Authors ATCs        |   | Invites teammates  |   | Reads/writes ATCs  |
| Links to AC         |   | Manages membership |   | via Bearer PAT     |
| Classifies UI/API/  |   | Renames workspace  |   | Powers automation  |
| Unit layers         |   | Issues invites     |   | pipelines          |
| Searches ATCs       |   |                    |   | run:execute (future)|
| Issues PATs         |   |                    |   |                    |
+--------------------+   +--------------------+   +--------------------+
       BROWSER                  BROWSER                REST API
       (cookie auth)            (cookie auth)          (Bearer PAT)
```

### Value Proposition per Actor

| Actor | Value |
|-------|-------|
| QA Engineer | Every test case is permanently anchored to a business requirement — test coverage is traceable by design, not by discipline |
| Team Lead / Admin | Full team visibility, invite-based onboarding with role isolation, RBAC enforced at DB layer — no shadow access |
| CI / AI Agent | One-round-trip provisioning (signup → PAT), scoped Bearer auth, GIN search, OpenAPI spec — headless-first design |

---

## 2. Entity Map

### 2.1 ASCII Relationship Diagram

```
+-------------+       +------------------+       +----------+
|  workspaces |1-----*| workspace_members|       | auth.users (Supabase)
|             |       |  (RBAC gate)     |       +----------+
|  slug(UNIQ) |       |  role/status     |            |
|  plan       |1     *|                  |            | owns
+------+------+       +------------------+            |
       |                                               v
       |1                                   +-----------------------+
       |                                   | access_tokens (PAT)    |
       *                                   | bk_pat_prefix.secret   |
  +----------+                             | scopes[]               |
  | projects |                             +-----------+-----------+
  | slug     |                                         |1
  +----+-----+                                         |
       |                                               *
       |1                              +------------------------------+
       *                               | access_token_secrets          |
  +---------+                          | hash (SHA-256, QA-unreadable)|
  | modules | <--+ (self-ref parent)   +------------------------------+
  | path    |----+
  | max d=6 |
  +----+----+
       |1
       *
  +-------------+
  | user_stories|
  | external_id | (Jira/GH link — future)
  +------+------+
         |1
         *
  +--------------------+
  | acceptance_criteria|
  | position (sortable)|
  +----+---------------+
       |
       *--M:N--*
  +------------+     via atc_acceptance_criteria
  | atcs       |     (the "anchoring moat")
  | slug(UNIQ) |
  | layer UI/  |
  |   API/Unit |
  | status     |
  | version    |
  | tsv (GIN)  |
  +-----+------+
        |1
        |--*--> atc_steps (position-ordered actions)
        |--*--> atc_assertions (position-ordered checks)
        |--*--> atc_acceptance_criteria (anchoring M:N)

+-------------------+  +------------------------+  +--------------------+
| workspace_invites |  | workspace_invite_secrets|  | idempotency_keys   |
| expires NOW+7d    |  | hash (QA-unreadable)    |  | 24h TTL            |
+-------------------+  +------------------------+  | POST replay guard  |
                                                    +--------------------+
+-------------------+  +--------------------+  +------------------+
| magic_link_tokens |  | magic_link_token_  |  | feature_flags    |
| (issuance audit)  |  | secrets (QA-unreg) |  | global/workspace |
+-------------------+  +--------------------+  +------------------+
+-------------------+  +------------------+
| activity_log      |  | user_view_state  |
| service_role only |  | per-user, per-   |
| write             |  | project UI state |
+-------------------+  +------------------+
```

### 2.2 Entity Register

| Entity | Business Role | Why It Exists |
|--------|---------------|---------------|
| `workspaces` | Multi-tenant root boundary — every piece of data scopes to one workspace | Teams need isolation from each other; `plan` field enables future tier gating |
| `workspace_members` | RBAC join table — the primary authorization gate for ALL RLS policies | A user without an active membership row sees zero data from any workspace table |
| `projects` | Application Under Test — logical container for a system being tested | Teams test multiple products; projects scope ATC suites to one system |
| `modules` | Self-referential tree (max depth 6) organizing stories and ATCs | Large suites need hierarchy; path column (`auth/login/magic-link`) gives materialized breadcrumbs |
| `user_stories` | Unit of business intent — the "why" behind a group of ATCs | Links tests to the feature they validate; `external_id`/`external_url` reserved for future Jira/GitHub sync |
| `acceptance_criteria` | Single testable condition for a story — the minimum anchor unit | Every ATC must reference at least one AC, enforcing traceability at the schema level |
| `atcs` | Core product entity — the Acceptance Test Case | Structured test case with layer classification, versioning, status tracking, and full-text search |
| `atc_steps` | Ordered actions within an ATC (Markdown) | Steps describe HOW to execute the test; separate from assertions for authoring clarity |
| `atc_assertions` | Ordered verifiable conditions within an ATC (YAML) | Assertions describe WHAT to verify; distinct from steps to mirror assertion-based frameworks |
| `atc_acceptance_criteria` | M:N junction — the "anchoring moat" | Structural proof that a test case has a business justification; no ATC without ≥1 AC |
| `access_tokens` | Personal Access Token (PAT) metadata — `bk_pat_<prefix>.<secret>` | Headless/CI/agent access without session cookies; scope-gated for least-privilege automation |
| `access_token_secrets` | SHA-256 hash of the PAT secret (sibling table) | Isolates the hash from normal SELECT paths; QA roles have no access to this table |
| `workspace_invites` | Invite record with 7-day expiry — the team onboarding mechanism | Email-token invite flow gated to admin/owner; prevents unauthorized self-enrollment |
| `workspace_invite_secrets` | SHA-256 hash of the invite token (sibling table) | Same secret-isolation pattern as access_token_secrets; prevents replay from a DB read |
| `idempotency_keys` | POST replay protection — 24h TTL, unique by (user, endpoint, key) | Prevents double-creates when clients retry; status tracks pending/succeeded/failed |
| `activity_log` | Workspace audit trail — service_role write only | Future audit/compliance read; no client write path in MVP |
| `feature_flags` | Gradual rollout gating — global or workspace-scoped | Allows dark launch of features; managed via Supabase Studio in MVP (no API) |
| `user_view_state` | Per-user UI persistence (view preferences per project) | Persists sidebar/view choices across sessions without a bloated user profile schema |
| `magic_link_tokens` | Issuance audit trail for magic-link OTPs | Enables per-email replay detection and rate-limiting analysis without touching Supabase auth schema |
| `magic_link_token_secrets` | Hash + IP hash for magic-link audit (sibling table) | Same isolation pattern; QA roles cannot read |

### 2.3 Key Relationship Narrative

The data model has one central chain: **Workspace → Members → Projects → Modules → User Stories → ATCs**. Every entity in this chain resolves its tenant by walking back to `workspace_id`. RLS policies on all tables enforce this resolution — a user not in `workspace_members` with `status='active'` sees zero rows.

The traceability chain runs perpendicular: **User Story → Acceptance Criteria → ATC** via the `atc_acceptance_criteria` M:N table. This is the "anchoring moat" — the structural proof that no ATC exists without business justification. Deleting a User Story is blocked (`ON DELETE RESTRICT` on `atcs.user_story_id`) while deleting a project cascades (`ON DELETE CASCADE` on `atcs.project_id`) — a story's ATCs survive only if the story survives.

Three sibling secret tables (`access_token_secrets`, `workspace_invite_secrets`, `magic_link_token_secrets`) hold only SHA-256 hashes. QA database roles (`qa_inspector_ro`, `qa_inspector_rw`) have `BYPASSRLS` but these tables have REVOKE grants applied — secrets are structurally inaccessible to the QA layer.

---

## 3. Business Flows

### Flow 1: Workspace Bootstrap (Signup → Workspace → Owner Enrollment)

```
User (browser)
     |
     | POST /api/v1/auth/magic-link {email}
     v
+--------------------+
| magic-link route   |  --> Supabase signInWithOtp --> Email delivered
| Records issuance   |      (magic_link_tokens insert — best-effort)
+--------------------+
     |
     | [User clicks email link]
     v
+--------------------+
| /auth/callback     |  exchangeCodeForSession(code)
| safeNext guard     |  --> session cookie set
+--------------------+
     |
     | GET /projects
     v
+---------------------+
| /projects RSC       |  SELECT workspace_members WHERE user_id = me
| No active membership|  --> redirect to /onboarding
+---------------------+
     |
     | POST /api/v1/workspaces {name, slug}
     v
+-----------------------------+
| workspace route handler     |  Validate slug (format, reserved, unique)
|                             |  --> bunkai_bootstrap_workspace(slug, name) RPC
|                             |      INSERT workspaces (plan='community')
|                             |      INSERT workspace_members (role='owner', status='active')
|                             |      (atomic, SECURITY DEFINER, single txn)
+-----------------------------+
     |
     | 201 {workspace}
     v
  /projects --> /projects/{slug}  (user is now owner with full access)
```

**Narrative:**
1. User submits email on `/login`. API calls Supabase `signInWithOtp` and records issuance to `magic_link_tokens` (best-effort — auth flow never fails if this insert fails).
2. User clicks link in email. `/auth/callback` exchanges the OTP code for a session cookie. The `safeNext` guard clamps any open-redirect attempt to `/projects`.
3. `/projects` RSC checks `workspace_members`. No active row → redirect to `/onboarding`.
4. User submits workspace name + slug. Zod validates format (3–40 chars, lowercase, no edge hyphen) and reserved slug set. Then `bunkai_bootstrap_workspace` RPC creates both the `workspaces` row and the `workspace_members` row atomically in a single SECURITY DEFINER transaction — solving the chicken-and-egg between "create workspace" and "you must be a member to insert into workspace_members".
5. New workspace is in `plan='community'` by default. Owner lands on `/projects/{slug}`.

**Business rules:** BR-002 (slug uniqueness), BR-004 (magic-link passwordless), BR-008 (open-redirect guard), BR-010 (owner auto-enrollment via RPC)

**Code files:** `app/api/v1/auth/magic-link/route.ts`, `app/auth/callback/route.ts`, `app/(app)/projects/page.tsx`, `app/(app)/onboarding/onboarding-form.tsx`, `app/api/v1/workspaces/route.ts`, `supabase/migrations/0006_bootstrap_workspace.sql`

---

### Flow 2: Magic-Link Auth Flow (detailed OTP exchange)

```
Browser                  Bunkai API                 Supabase Auth            Email Client
   |                          |                           |                       |
   |-- POST /auth/magic-link ->|                           |                       |
   |   {email, next}          |-- signInWithOtp(email) -->|                       |
   |                          |   (emailRedirectTo=       |-- Send OTP email ---> |
   |                          |    /auth/callback?next=..)| (SMTP)                |
   |                          |<-- {ok:true} -------------|                       |
   |<-- 200 {ok:true} --------|                           |                       |
   |                          |                           |                       |
   |  [User clicks email link]                            |                       |
   |                          |                           |                       |
   |-- GET /auth/callback?code=xxx&next=/projects ------->|                       |
   |                          |-- exchangeCodeForSession->|                       |
   |                          |<-- session (JWT+refresh) -|                       |
   |<-- 307 Set-Cookie + redirect to safeNext ------------|                       |
```

**Narrative:**
1. Client POSTs `{email, next}` to `/api/v1/auth/magic-link`. Validation: valid email, optional root-relative `next` path.
2. API calls Supabase `signInWithOtp`. Supabase sends OTP email (token valid 1 hour). Best-effort insert to `magic_link_tokens` records the issuance for replay-guard analysis.
3. Client UI transitions to "Check your inbox" state. No further server round-trip.
4. User clicks link. Browser hits `/auth/callback?code=xxx`. Handler calls `exchangeCodeForSession(code)`. On success: session cookie set. On failure: redirect to `/login?error=otp_exchange_failed`.
5. Redirect target is validated by `safeNext`: must start with `/` and not `//`. Default is `/projects`.

**Business rules:** BR-004, BR-008

**Code files:** `app/api/v1/auth/magic-link/route.ts`, `app/auth/callback/route.ts`

---

### Flow 3: Email/Password Auth + PAT Issuance (Headless)

```
CLI / CI Agent
     |
     | POST /api/v1/auth/signup {email, password, pat_scopes, pat_name}
     v
+---------------------------------------+
| /auth/signup route handler             |
| admin.auth.createUser(                |
|   email, password, email_confirm:true) |  <-- bypasses OTP email
| signInWithPassword(email, password)   |  <-- populates session
| mintPat(userId, scopes)               |  <-- generates bk_pat_xxx.yyy
|   generateSecret(32 bytes)            |
|   tokenPrefix = secret[0:12]          |
|   hash = sha256Hex(secret)            |
|   INSERT access_tokens                |
|   INSERT access_token_secrets(hash)   |
+---------------------------------------+
     |
     | 201 {user, session, pat: {token, id, scopes, ...}}
     |     WARNING: "Store the PAT token now — it cannot be retrieved later"
     v
Agent stores raw token: bk_pat_<prefix>.<secret>
```

**Narrative:**
1. Agent POSTs email + password + optional PAT config. The `email_confirm:true` flag on `admin.auth.createUser` bypasses the OTP confirmation email — essential for headless provisioning where no email client is available.
2. Immediately signs in with password to get session tokens.
3. `mintPat` generates a 32-byte random secret via `crypto.getRandomValues`. First 12 chars become `token_prefix` (indexed in `access_tokens` for O(1) candidate lookup). SHA-256 hash of the full secret is stored in the sibling table `access_token_secrets`. The QA roles cannot read this table.
4. Response returns the raw token exactly once. The hash is never retrievable after this response.
5. If the email already exists, returns 409 Conflict — agent should use `/auth/signin` instead.

**Business rules:** BR-005 (PAT shown once), BR-009 (headless user bypasses email confirm), BR-015 (session required to issue PAT)

**Code files:** `app/api/v1/auth/signup/route.ts`, `app/api/v1/auth/signin/route.ts`, `lib/api/pat.ts`, `supabase/migrations/0008_access_tokens.sql`, `supabase/migrations/0011_split_token_secrets.sql`

---

### Flow 4: PAT Bearer Authentication (Verify on Every Request)

```
CLI / CI Agent                       Bunkai API Route Handler
     |                                         |
     |-- GET /api/v1/me                        |
     |   Authorization: Bearer bk_pat_xxx.yyy  |
     v                                         |
+------------------------------------------+   |
| requireBearerToken(request)               |   |
|                                           |   |
| 1. Extract header                         |   |
| 2. Validate format: starts with 'bk_pat_'|   |
| 3. Split: prefix (12 chars) + remainder  |   |
| 4. SELECT access_tokens                  |   |
|    WHERE token_prefix = prefix LIMIT 5   |   |
| 5. SELECT access_token_secrets           |   |
|    WHERE token_id IN (candidates)        |   |
| 6. sha256(prefix + remainder) == hash?  |   |
| 7. Check revoked_at IS NULL              |   |
| 8. Check expires_at > now() (if set)     |   |
+----+------------------+------------------+   |
     | PASS              | FAIL                  |
     v                   v                       |
BearerContext{      401 "Invalid token."        |
  userId,           (uniform — no detail leak)   |
  workspaceId,                                   |
  scopes}                                        |
     |                                           |
     | requireScope(ctx, 'atc:read') -- if needed|
     +-----> 403 "Token missing required scope"  |
     |                                           |
     +-- Business query (admin client, no RLS) ->+
     |                                           |
     +<-- 200 response --------------------------+
```

**Narrative:**
1. Every Bearer call hits `requireBearerToken` before the route handler executes.
2. Prefix-based lookup limits candidates to ≤5 rows before hash comparison — O(1) indexed lookup, avoiding full table scan.
3. Hash comparison is constant-time (`crypto.timingSafeEqual` or equivalent).
4. All failure cases return uniform 401 with no detail — no oracle for whether a token ID exists vs. wrong secret.
5. Scope check happens after auth, before handler: `requireScope(ctx, scope)` throws 403 with the required scope name.
6. Bearer-authenticated requests use the Supabase admin client (service role) — RLS is bypassed. The BearerContext carries `workspaceId` for the handler to scope queries manually.
7. Fire-and-forget `touchLastUsed` updates `access_tokens.last_used_at` asynchronously after the response.

**Business rules:** BR-017 (uniform 401), BR-019 (no detail leak)

**Code files:** `lib/api/middleware/bearer.ts`, `lib/api/auth.ts`, `app/api/v1/me/route.ts`

---

### Flow 5: Workspace Invite Flow (Send → Accept)

```
Admin/Owner (browser)                          Invitee
     |                                             |
     | POST /api/v1/workspaces/{id}/invites        |
     | {email, role: viewer|member|admin}          |
     v                                             |
+------------------------------------+            |
| invites route handler               |            |
| RLS gate: must be admin/owner       |            |
| generateInviteToken()               |            |
|   raw token (32+ bytes)             |            |
|   INSERT workspace_invites          |            |
|     expires_at = now + 7d           |            |
|   INSERT workspace_invite_secrets   |            |
|     token_hash = sha256(raw)        |            |
| console.log(accept_url)             | <-- MVP: no email delivery
| Return {invite, accept_url, token} |            |
+------------------------------------+            |
     |                                             |
     | Admin copies accept_url, shares manually    |
     |---> accept_url to Invitee ------------------->
                                                   |
                                    POST /api/v1/invites/accept
                                    {token: raw_token}
                                                   |
                                    +---------------------------------+
                                    | accept route handler             |
                                    | MUST be signed in               |
                                    | sha256(token) -> lookup secrets |
                                    | Load invite (admin client)      |
                                    | Checks:                         |
                                    |   revoked_at IS NULL            |
                                    |   accepted_at IS NULL           |
                                    |   expires_at > now()            |
                                    |   invite.email == caller.email  |
                                    | UPSERT workspace_members        |
                                    |   (status='active', role=invite)|
                                    | Stamp accepted_at on invite     |
                                    +---------------------------------+
                                                   |
                                    redirect to /projects
```

**Narrative:**
1. Only admin or owner can send an invite (`bunkai_is_workspace_admin` RLS helper check). The `owner` role cannot be issued via invite (Zod enum excludes it).
2. A raw token is generated and returned in the response. The hash is stored in `workspace_invite_secrets`. In MVP the accept URL is only logged to stdout — no transactional email is delivered. The admin must copy-paste the URL manually.
3. The invitee's accept URL arrives via any channel. They must be signed in (magic-link or password) before acceptance proceeds.
4. The accept endpoint loads the invite via the admin client (bypasses RLS), hashes the submitted token, looks up the hash in `workspace_invite_secrets`. All failure states return distinct status codes.
5. On success: `workspace_members` row is upserted with `status='active'` and the invite's role. If the user already had an `invited` row (pre-created via some path), it is promoted. The invite's `accepted_at` is stamped, making it single-use.

**Business rules:** BR-006 (7-day expiry), BR-011 (token shown once), BR-012 (email match), BR-013 (single-use), BR-014 (no owner invite)

**Code files:** `app/api/v1/workspaces/[id]/invites/route.ts`, `app/api/v1/invites/accept/route.ts`, `lib/api/invite-tokens.ts`, `supabase/migrations/0010_workspace_invites.sql`, `supabase/migrations/0011_split_token_secrets.sql`

---

### Flow 6: Project + Module Hierarchy Management

```
+------------+      +----------+      +----------+       +--------------+
| workspace  | ---> | project  | ---> | module   | ----> | user_stories |
| (tenant)   |      | slug     |      | path     |       | title        |
+------------+      +----------+      | max d=6  |       | external_id  |
                                      | parent   |       +--------------+
                                      | self-ref |             |
                                      +----------+             v
                                      (tree via               ACs
                                       lib/tree.ts)
```

**Narrative:**
1. A workspace contains many projects. A project contains many modules. Modules form a self-referential tree using `parent_module_id` FK and a materialized `path` column (slash-separated, e.g., `auth/login/magic-link`).
2. The `path` column is enforced unique within a project. A DB CHECK constraint `modules_path_depth_max_6` limits tree depth to 6 segments — prevents runaway nesting.
3. The `lib/tree.ts` utility transforms flat `Module[]` + `UserStory[]` + `Atc[]` arrays from the DB into a nested `ModuleTreeNode[]` for the sidebar component. No recursive DB query — flat fetch + in-memory tree build.
4. User stories live inside a module. Stories have `external_id` and `external_url` columns for future Jira/GitHub linking (not yet implemented).
5. Deleting a project cascades to modules, user stories, ACs, and ATCs. Deleting a module cascades to user stories and ATCs. Deleting a user story is blocked if ATCs reference it (`ON DELETE RESTRICT` on `atcs.user_story_id`) — this is intentional: an ATC is evidence of testing a requirement; deleting the requirement orphans the evidence.

**Business rules:** BR-003 (module depth ≤ 6)

**Code files:** `supabase/migrations/0002_projects_modules.sql`, `supabase/migrations/0003_authoring.sql`, `lib/tree.ts`, `components/layout/Sidebar.tsx`

---

### Flow 7: User Story Lifecycle (Create → AC Attachment → ATC Anchoring)

```
member/admin/owner
     |
     | [Create user story in module]
     v
 user_stories INSERT
   module_id (FK)
   title, description
   external_id (optional, Jira/GH)
   external_url (optional)
     |
     | [Add acceptance criteria]
     v
 acceptance_criteria INSERT (1..N)
   user_story_id (FK)
   title (single testable condition)
   position (sortable order)
     |
     | [Author ATC — see Flow 8]
     v
 ATC must SELECT ≥1 AC from this story
 atc_acceptance_criteria (atc_id, ac_id) -- anchoring moat
```

**Narrative:**
1. A User Story is the unit of business intent. It lives in a module. Its `title` describes what the user can do. `description` is the narrative detail.
2. Acceptance Criteria are the testable conditions. Each has a `position` (sortable), unique within the story. An AC without ATCs linked to it is untested — that gap is detectable by querying `atc_acceptance_criteria`.
3. An ATC can reference ACs from only one user story (the ATC has a direct `user_story_id` FK). The M:N table binds it to the specific ACs within that story.
4. There is no UI for creating user stories or modules in the MVP web interface — these are created via direct Supabase access or API in the current build. Phase E of the roadmap covers project/module/story creation UI.

**Code files:** `supabase/migrations/0003_authoring.sql`, `supabase/migrations/0004_atcs.sql`, `components/atcs/AnchoringPanel.tsx`

---

### Flow 8: ATC Authoring / Save (bunkai_save_atc RPC)

```
QA Engineer (browser)
     |
     | Navigate to /projects/{slug}/atcs/{id}
     v
+----------------------------------+
| RSC: page.tsx fetches in parallel|
| SELECT atc + steps + assertions  |
| SELECT all stories (for dropdown)|
| SELECT all ACs for project       |
+----------------------------------+
     |
     | User edits in AtcEditor:
     | - title (text input)
     | - layer chip: UI / API / Unit
     | - tags (enter-delimited)
     | - steps (Monaco, Markdown)
     | - assertions (Monaco, YAML)
     | - story selector (AnchoringPanel)
     | - AC checkboxes (AnchoringPanel)
     |
     | Click Save
     v
+------------------------------------+
| saveAtcAction (server action)       |
| Validate (app layer):              |
|   userStoryId non-empty            |
|   acIds.length >= 1 (anchoring)    |
|   title.trim().length > 0          |
| parseStepsMarkdown(stepsMd)        |
| parseAssertionsYaml(assertionsYaml)|
|                                    |
| supabase.rpc('bunkai_save_atc',{   |
|   p_atc_id, p_title, p_layer,     |
|   p_tags, p_user_story_id,        |
|   p_steps (JSONB), p_assertions,  |
|   p_ac_ids                        |
| })                                 |
+------------------------------------+
     |
     | bunkai_save_atc RPC (SECURITY INVOKER, single txn):
     | UPDATE atcs SET title, layer, tags, user_story_id,
     |                version = version + 1, updated_at = now()
     | DELETE atc_steps WHERE atc_id
     | INSERT atc_steps[] (position-ordered from JSON array)
     | DELETE atc_assertions WHERE atc_id
     | INSERT atc_assertions[] (position-ordered)
     | DELETE atc_acceptance_criteria WHERE atc_id
     | INSERT atc_acceptance_criteria[] (foreach ac_id)
     |
     | (DB triggers fire during UPDATE:
     |   atcs_set_updated_at -- sets updated_at
     |   atcs_refresh_tsv   -- rebuilds tsv from title+tags)
     v
+--------------------+
| revalidatePath     |  Next.js cache invalidation for project + ATC pages
| success toast      |
+--------------------+
```

**Narrative:**
1. Page fetches all required data server-side via parallel RSC queries (no client round-trip to open the editor).
2. The editor uses Monaco (lazy-loaded via `next/dynamic`) for both steps (Markdown) and assertions (YAML). Tags use enter-delimited input. Layer is a chip selector.
3. The AnchoringPanel enforces the moat: save is blocked client-side if no story or no AC is selected. The server action also validates these conditions before calling the RPC.
4. `bunkai_save_atc` is `SECURITY INVOKER` (not SECURITY DEFINER) — RLS still evaluates as the caller, so a viewer role would hit RLS denial at the UPDATE statement. The RPC is a transactional wrapper, not a privilege escalation.
5. Steps and assertions are full-replace: the RPC deletes all existing children and re-inserts from the submitted JSONB arrays. Position in the array drives the `position` column. No child row IDs are preserved across saves — the editor treats children as an owned editable block.
6. On UPDATE, two DB triggers fire: `atcs_set_updated_at` sets `updated_at = now()`, and `atcs_refresh_tsv` rebuilds the tsvector from `title || ' ' || array_to_string(tags, ' ')`.
7. Note: ATC CREATE (new ATC INSERT) is NOT yet implemented in the web UI or API. Phase E covers this. Only EDIT via `bunkai_save_atc` is available.

**Business rules:** BR-001 (anchoring moat), BR-007 (viewer blocked), BR-018 (atomic save), BR-019 (version increment)

**Code files:** `app/(app)/projects/[projectSlug]/atcs/[atcId]/actions.ts`, `components/atcs/AtcEditor.tsx`, `components/atcs/AnchoringPanel.tsx`, `lib/supabase/rpc.ts`, `supabase/migrations/0007_save_atc.sql`, `supabase/migrations/0004_atcs.sql`

---

### Flow 9: ATC Full-Text Search

```
User types query in search UI
     |
     | Query: "login magic" or "smoke" (tag prefix)
     v
+----------------------------------------+
| SELECT atcs                             |
| WHERE tsv @@ to_tsquery('english', $1) |
| AND project_id = $project              |
| (RLS filters to workspace membership)  |
+----------------------------------------+
     |
     | GIN index atcs_tsv_gin_idx
     | tsv = to_tsvector('english',
     |   title || ' ' || array_to_string(tags, ' ')
     | )
     |
     v
Ranked ATC list returned

Index rebuild: BEFORE INSERT OR UPDATE OF title, tags
  trigger: atcs_refresh_tsv
  always current — no manual reindex needed
```

**Narrative:**
1. The `atcs.tsv` column is a regular tsvector column (not a GENERATED ALWAYS column — Postgres's `to_tsvector(regconfig, text)` is `STABLE`, not `IMMUTABLE`, disqualifying it from a generated column). Instead a BEFORE trigger `atcs_refresh_tsv` regenerates `tsv` on every INSERT or UPDATE of `title` or `tags`.
2. The GIN index (`atcs_tsv_gin_idx`) makes text search fast. GIN inverts the tsvector — each lexeme maps to a list of ATC IDs, enabling sub-millisecond prefix matching on typical TMS-scale datasets.
3. The search vector includes both title words and tags. A query for `smoke` matches ATCs tagged `["auth", "smoke"]` as well as ATCs with "smoke" in the title.
4. All results are still filtered by the RLS `atcs_select_workspace_member` policy — users cannot search across workspaces.

**Code files:** `supabase/migrations/0004_atcs.sql` (`atcs_tsv_gin_idx`, `bunkai_atcs_refresh_tsv`, `atcs_refresh_tsv` trigger)

---

### Flow 10: Headless API Access (CI/Agent PAT Flow)

```
CI Pipeline startup
     |
     | POST /api/v1/auth/signup (once — idempotent via email)
     | {email: ci-agent@domain.dev, password, pat_scopes: ['atc:read','atc:write']}
     v
  Returns: {user, session, pat: {token: 'bk_pat_xxx.yyy', ...}}
     |
     | Store PAT token in CI secret store
     v
Each pipeline run:
     |
     | GET/POST /api/v1/* with Authorization: Bearer bk_pat_xxx.yyy
     v
  requireBearerToken() -- see Flow 4
     |
     | Scope check for each endpoint
     v
  Business logic (admin client, manual workspace scoping)
     |
     | Response
     v
  CI processes results (ATC status updates, reporting, etc.)

If email already registered:
     POST /api/v1/auth/signin {email, password}
     --> 200 {user, session, pat}  (fresh PAT minted)
```

**Narrative:**
1. A CI agent needs exactly one round-trip to become operational: `POST /api/v1/auth/signup` creates the user, signs them in, and mints a PAT in a single response. The agent stores the raw PAT in its secret store immediately.
2. On subsequent runs the agent uses the stored PAT as a Bearer token. If the PAT was revoked, a new one can be minted via `POST /api/v1/auth/signin`.
3. Bearer requests use the Supabase admin client — no RLS. The handler is responsible for scoping queries to the correct workspace using `BearerContext.workspaceId`.
4. The `run:execute` PAT scope exists in the schema for future test execution reporting. No `/api/v1/runs` endpoint exists yet.

**Business rules:** BR-005, BR-015, BR-017, BR-019

**Code files:** `app/api/v1/auth/signup/route.ts`, `app/api/v1/auth/signin/route.ts`, `lib/api/middleware/bearer.ts`, `app/api/v1/me/route.ts`

---

### Flow 11: PAT Lifecycle (Mint → Use → Revoke)

```
mint:
  POST /api/v1/tokens {scopes, name?, workspace_id?, expires_in_days?}
    -> INSERT access_tokens (token_prefix, scopes, expires_at, ...)
    -> INSERT access_token_secrets (hash = sha256(secret))
    -> Return raw token ONCE: 201 {id, token: 'bk_pat_xxx.yyy', scopes, ...}
         + warning: "Store the PAT token now — it cannot be retrieved later"

use:
  Any /api/v1/* with Bearer token
    -> requireBearerToken() verifies hash (see Flow 4)
    -> touchLastUsed() fire-and-forget (updates last_used_at)

list:
  GET /api/v1/tokens
    -> Returns id, name, scopes, expires_at, last_used_at, created_at
    -> Raw token SECRET never returned

revoke:
  DELETE /api/v1/tokens/{id}
    -> UPDATE access_tokens SET revoked_at = now()
    -> 204 No Content
    -> Next Bearer call with this token -> 401

re-check on every Bearer call:
  revoked_at IS NOT NULL -> 401
  expires_at < now() -> 401
  (soft-delete: row preserved for audit)
```

**Code files:** `app/api/v1/tokens/route.ts`, `app/api/v1/tokens/[id]/route.ts`, `lib/api/pat.ts`

---

## 4. State Machines

### 4.1 WorkspaceMember Status

```
                +--------+
      invite    |        |
  sent by  ---> |invited |
  admin/owner   |        |
                +---+----+
                    |                      +----------+
                    | accept (within 7d,   |          |
                    | email match, not     |  (end)   |
                    | revoked)             +----------+
                    |                          ^
                    |          expired / revoked invite
                    v
               +--------+
               | active |  <----+
               |        |       | admin reinstates
               +---+----+       |
                   |            |
                   | admin      |
                   | suspends   |
                   v            |
              +-----------+     |
              | suspended +-----+
              |           |
              +-----------+
```

| From | To | Trigger | Guard | Effects |
|------|----|---------|-------|---------|
| (new) | `invited` | Admin/owner sends invite | `bunkai_is_workspace_admin` | `workspace_invites` row created; `expires_at = now()+7d` |
| `invited` | `active` | `POST /api/v1/invites/accept` | Not expired, not revoked, email match | `workspace_invites.accepted_at` stamped; member gains RLS access |
| `invited` | (deleted) | Invite expires or is revoked | — | No membership row in most paths; invite marked revoked/expired |
| `active` | `suspended` | Admin action (PATCH member) | Admin/owner role | RLS denies all data access (`status='active'` check fails) |
| `suspended` | `active` | Admin reinstates | Admin/owner role | Access restored |

RLS enforcement: all mutation policies on workspace-scoped tables check `wm.status = 'active'`. A `suspended` member's SELECT is also blocked.

---

### 4.2 WorkspaceInvite Lifecycle

```
    create by      +----------+
    admin/owner -> | pending  |
                   | (7d TTL) |
                   +----+-----+
                        |
          +-------------+-----------+
          |             |           |
          v             v           v
     +--------+    +--------+   +--------+
     |accepted|    |expired |   |revoked |
     | (final)|    |(derived|   |(final) |
     +--------+    | no col)|   +--------+
                   +--------+

"expired" is derived — no DB column; computed as expires_at < now() at accept time
```

| From | To | Trigger | Guard | Effects |
|------|----|---------|-------|---------|
| (new) | `pending` | `POST /api/v1/workspaces/{id}/invites` | Admin/owner | `expires_at = now()+7d`; raw token returned once |
| `pending` | `accepted` | `POST /api/v1/invites/accept` | Not expired, not revoked, email match | `accepted_at` + `accepted_by_user_id` stamped; workspace_members upserted |
| `pending` | `expired` | Time passes | `expires_at < now()` | Derived state — accept returns 409 |
| `pending` | `revoked` | `DELETE /api/v1/workspaces/{id}/invites/{id}` | Admin/owner | `revoked_at` set; accept returns 409 |

Note: invite token rotation (`POST /api/v1/workspaces/{id}/invites/{id}`) creates a new token hash — the existing invite row gets a fresh secret. The old token is immediately invalid.

---

### 4.3 AccessToken (PAT) Lifecycle

```
                    +--------+
  POST /api/v1/     |        |   touchLastUsed()
  tokens ---------> | active | <-- (fire-and-forget on each Bearer call)
  (or signup/signin)|        |
                    +---+----+
                        |          +----------+
                        |--------> | revoked  | (soft-delete, row kept)
                        |  DELETE  +----------+
                        |  /tokens/{id}
                        |
                        |--------> | expired  | (if expires_at was set)
                                   +----------+

Both revoked and expired tokens fail requireBearerToken() with uniform 401.
```

| From | To | Trigger | Guard | Effects |
|------|----|---------|-------|---------|
| (new) | `active` | `POST /api/v1/tokens` (or auth/signup/signin) | Session auth required | Raw token returned once; hash in `access_token_secrets` |
| `active` | `active` | Bearer call succeeds | — | `last_used_at` updated async |
| `active` | `revoked` | `DELETE /api/v1/tokens/{id}` | Token owner | `revoked_at = now()` set; soft-delete preserves audit row |
| `active` | `expired` | `expires_at < now()` | — | `requireBearerToken` returns 401 |

---

### 4.4 ATC Status

```
  CREATE ATC --> [unrun] (default)
                    |
            run:execute (future)
                    |
                    v
               [running]  <-- re-execute from any terminal state
               /   |   \   \
              v    v    v    v
          [pass] [fail] [blocked] [skipped]
            |      |       |         |
            +------+-------+---------+
                           |
                     manual reset / new run cycle
                           |
                           v
                        [unrun]
```

| From | To | Trigger | Guard | Effects |
|------|----|---------|-------|---------|
| (new) | `unrun` | ATC created | — | Default status |
| `unrun` | `running` | Test execution starts | `run:execute` scope (Phase 2) | — |
| `running` | `pass` | All assertions pass | — | — |
| `running` | `fail` | Assertion(s) fail | — | — |
| `running` | `blocked` | External dependency blocks | — | — |
| `running` | `skipped` | Test skipped during run | — | — |
| Any terminal | `unrun` | Manual reset or new run cycle | `atc:write` | `version` increments on next `bunkai_save_atc` call |

Note: transitions to `running`/`pass`/`fail` require the `run:execute` endpoint which does not yet exist (Phase 2). Status can be updated directly via `bunkai_save_atc` today.

---

### 4.5 IdempotencyKey Status

```
  POST with Idempotency-Key --> [pending] (inserted)
          |                         |
          |   handler succeeds      |   handler fails
          v                         v
     [succeeded]               [failed]
          |                         |
    subsequent request         retry with same
    with same key+hash         key+hash allowed
    -> replay stored resp      -> re-runs handler
```

| From | To | Trigger | Guard | Effects |
|------|----|---------|-------|---------|
| (new) | `pending` | New idempotency key seen | — | Row inserted with request hash |
| `pending` | `succeeded` | Handler completes | — | `response_snapshot` stored |
| `pending` | `failed` | Handler throws | — | No snapshot; retry allowed |
| `succeeded` | — | Same key + same hash replayed | — | Stored response returned; handler skipped |
| `succeeded` | 409 | Same key + different hash | — | "Idempotency-Key reused with different payload" |

**Code files:** `lib/api/idempotency.ts`, `supabase/migrations/0009_cross_cutting.sql`

---

## 5. Automatic Processes

### 5.1 DB Triggers

| Trigger Name | Table | Event | Function | Why It Exists |
|--------------|-------|-------|----------|---------------|
| `atcs_set_updated_at` | `atcs` | BEFORE UPDATE | `bunkai_set_updated_at()` | Keeps `atcs.updated_at` accurate on every mutation without requiring the application to pass a timestamp |
| `atcs_refresh_tsv` | `atcs` | BEFORE INSERT OR UPDATE OF `title`, `tags` | `bunkai_atcs_refresh_tsv()` | Rebuilds the GIN-indexed `tsv` tsvector from `title + tags` so full-text search is always current; `to_tsvector(regconfig,text)` is STABLE (not IMMUTABLE) so a generated column is not possible |

Source: `supabase/migrations/0004_atcs.sql`

### Trigger functions (not triggers themselves — called by triggers or RPCs)

| Function | Type | Why It Exists |
|----------|------|---------------|
| `bunkai_set_updated_at()` | TRIGGER FUNCTION (PLPGSQL) | Shared `updated_at` stamp — currently used only on `atcs` but designed to be reusable |
| `bunkai_atcs_refresh_tsv()` | TRIGGER FUNCTION (PLPGSQL) | ATC full-text search vector rebuild |
| `bunkai_bootstrap_workspace(p_slug, p_name)` | RPC (SECURITY DEFINER) | Atomic workspace + owner-membership creation; resolves RLS chicken-and-egg for first workspace |
| `bunkai_save_atc(p_atc_id, ...)` | RPC (SECURITY INVOKER) | Atomic ATC header + steps + assertions + AC anchoring update in one transaction |
| `bunkai_is_workspace_member(ws_id)` | RLS HELPER (SECURITY DEFINER, STABLE) | Avoids 42P17 infinite recursion in `workspace_members` self-referencing RLS policies |
| `bunkai_can_write_workspace(ws_id)` | RLS HELPER (SECURITY DEFINER, STABLE) | Role ≥ member check for mutation policies across all workspace-scoped tables |
| `bunkai_is_workspace_admin(ws_id)` | RLS HELPER (SECURITY DEFINER, STABLE) | Admin/owner check for invite management policies |
| `bunkai_is_workspace_owner(ws_id)` | RLS HELPER (SECURITY DEFINER, STABLE) | Owner-only check for workspace rename/delete policies |

Sources: `supabase/migrations/0004_atcs.sql`, `supabase/migrations/0005_rls_helpers.sql`, `supabase/migrations/0006_bootstrap_workspace.sql`, `supabase/migrations/0007_save_atc.sql`

### 5.2 Cron Jobs

No cron jobs detected in the codebase. Supabase's `pg_cron` extension is not configured. The following cleanup tasks are handled at the application layer on-demand:

| Task | Current Approach | Gap |
|------|-----------------|-----|
| Expire idempotency_keys (24h TTL) | Not implemented — rows accumulate | Add `pg_cron` or Supabase Edge Function to purge `expires_at < now()` |
| Expire magic_link_tokens (1h TTL) | Not implemented — rows accumulate | Same |
| Expire workspace_invites (7d) | Derived state at accept-time, not physically cleaned | Low priority — rows are small |

### 5.3 Incoming Webhooks

No incoming webhooks detected. The codebase has no `/api/webhooks/*` route. The following are planned or implied:

| Webhook | Status | Notes |
|---------|--------|-------|
| Supabase Auth `auth.users` events (e.g., `USER_SIGNED_IN`) | Not configured | No webhook handler found |
| External issue tracker (Jira) to sync `user_stories.external_id` | Planned/implied | `external_id` field exists; no sync endpoint found |
| CI run results (`run:execute` scope) | Phase 2 — not yet implemented | `run:execute` PAT scope reserved |

---

## 6. External Integrations

### 6.1 Supabase Auth

**Purpose:** Identity provider — issues JWTs, sends magic-link OTP emails, manages password auth, provides admin `createUser` API.

```
Browser / CLI                 Bunkai API                    Supabase Auth
     |                             |                              |
     |-- POST /auth/magic-link --->|                              |
     |                             |-- signInWithOtp(email) ----->|
     |                             |                              |-- SMTP email --> User
     |                             |<-- {ok:true} ----------------|
     |<-- 200 {ok:true} ----------|                              |
     |                             |                              |
     |-- GET /auth/callback ------>|                              |
     |                             |-- exchangeCodeForSession --> |
     |                             |<-- session (JWT+refresh) ----|
     |<-- 307 + cookie -----------|                              |
```

| Aspect | Detail |
|--------|--------|
| Auth methods | Magic-link OTP (primary), email/password (headless/QA) |
| Client libs | `@supabase/supabase-js ^2.106.0`, `@supabase/ssr ^0.10.3` |
| Anon client | `NEXT_PUBLIC_SUPABASE_ANON_KEY` — RLS-gated, used in browser and middleware |
| Admin client | `SUPABASE_SERVICE_ROLE_KEY` — bypasses RLS, server-only, import-guarded (`server-only`) |
| Token type | JWTs issued by Supabase Auth; PATs are Bunkai-native (not Supabase JWTs) |
| OTP validity | 1 hour (Supabase default) |
| Depends on flows | Flow 1 (magic-link signup), Flow 2 (OTP exchange), Flow 3 (headless signup), Flows 4/10 (Bearer verify uses admin client for token lookup) |

---

### 6.2 Supabase PostgreSQL 17 + RLS

**Purpose:** Sole data store. Row-Level Security is the multi-tenant isolation layer — not an application-layer concern.

```
Next.js Route Handler / RSC
     |
     | supabase.from('atcs').select(...)  [anon/session key]
     v
+-----------------------------------------+
| PostgreSQL 17 + PostgREST               |
| RLS policy evaluation per row:          |
|   SELECT: bunkai_is_workspace_member()  |
|   INSERT/UPDATE/DELETE: bunkai_can_write_workspace() / bunkai_is_workspace_admin() / bunkai_is_workspace_owner() |
|   Secret tables: REVOKE grants (no policy needed)  |
+-----------------------------------------+
     |
     | Filtered result set (0 rows if RLS denies)
     v
Route Handler / RSC
```

| Aspect | Detail |
|--------|--------|
| All tables | RLS enabled on all 19 tables across 12 migrations |
| Key pattern | Helpers (`bunkai_is_workspace_member`, etc.) SECURITY DEFINER to prevent 42P17 recursive policy infinite loop |
| QA roles | `qa_inspector_ro` (SELECT), `qa_inspector_rw` (SELECT/INSERT/UPDATE/DELETE) — both BYPASSRLS but secret tables have explicit REVOKE grants |
| Admin client | Service-role client bypasses all RLS — used for invite accept, token secrets, headless user creation |
| Depends on flows | All flows depend on PostgreSQL. RLS is the authorization enforcement layer for all browser/session flows |

---

### 6.3 Vercel

**Purpose:** Deployment platform for the Next.js app (serverless functions + edge runtime for middleware).

```
+---------------------------+
| Vercel Platform            |
|                           |
| Edge: middleware.ts        |  Session check + route protection
| Serverless: app/api/v1/*  |  Route handlers
| Static: app/(auth)/login  |  Login page
| RSC: app/(app)/*          |  Server-rendered pages
+---------------------------+
```

| Aspect | Detail |
|--------|--------|
| Environments | `upexbunkai.vercel.app` (production), `staging-upexbunkai.vercel.app` (staging) |
| Edge function | `middleware.ts` — session check on all `PROTECTED_PREFIXES` routes |
| TLS | Automatic (Vercel platform) |
| CI/CD | NOT configured — no `.github/workflows/` in target repo; deployments are manual or Vercel auto-deploy from push |
| Monitoring | None detected (no Sentry, Datadog, etc.) |
| Depends on flows | All flows — Vercel hosts the application |

---

### 6.4 Supabase Storage

No Supabase Storage usage detected. The product has no file upload feature. Evidence: `@supabase/storage-js` is not referenced in `package.json` or any source file. Mark as Discovery Gap if attachments/screenshots are planned.

---

### 6.5 Transactional Email (Resend — NOT YET WIRED)

**Purpose:** Intended for workspace invite email delivery. Currently not wired.

```
CURRENT (MVP):
  POST /api/v1/workspaces/{id}/invites
    --> console.log(accept_url)  ← admin must copy-paste manually

INTENDED (Phase N — unscheduled):
  POST /api/v1/workspaces/{id}/invites
    --> Resend API: send invite email to invitee
        with accept_url embedded
```

| Aspect | Detail |
|--------|--------|
| Status | Not wired in target repo. `resend` package is in the QA repo boilerplate, not in `upex-bunkai-tms` |
| Impact | Invitees only receive their invite link if the admin manually shares it. This is a known MVP gap documented in `app/api/v1/workspaces/[id]/invites/route.ts:79` |
| Depends on flows | Flow 5 (workspace invite) |

---

## 7. Discovery Gaps

| # | Gap | Impact | Where to Investigate |
|---|-----|--------|---------------------|
| 1 | **ATC CREATE flow not implemented** — only EDIT via `bunkai_save_atc` exists. The "New ATC" button in the UI exists but no INSERT endpoint or server action was found in `app/api/v1/` or `app/(app)/projects/[projectSlug]/atcs/` | Cannot automate ATC creation; all test fixtures must pre-seed ATCs in DB | Search for `INSERT INTO atcs` or direct Supabase insert in page components; track as Phase E |
| 2 | **Project / module / story creation UI absent** — "Phase E" noted in `app/(app)/projects/page.tsx:51`. No `POST /api/v1/projects`, `/modules`, or `/user_stories` endpoints found | QA cannot automate the full hierarchy setup; must seed via direct DB | Read Phase E roadmap items (BK Jira backlog) |
| 3 | **`run:execute` scope has no endpoint** — PAT scope `run:execute` exists in schema and is mentioned in `app/qa/qa-config.ts` but no `/api/v1/runs` endpoint or `runs` table was found | Core product loop (author → execute → report) is incomplete | Phase 2 roadmap — confirm target schema design |
| 4 | **No transactional email wired** — `workspace_invites.accept_url` is only logged to stdout in MVP | Team onboarding requires manual copy-paste; blocks invite E2E automation | Integrate Resend in target repo before testing invite flow end-to-end |
| 5 | **No cron for TTL cleanup** — `idempotency_keys` (24h) and `magic_link_tokens` (1h) accumulate indefinitely | DB bloat over time; not an immediate QA risk | Add `pg_cron` or Supabase Edge Function scheduled job |
| 6 | **Feature flags API absent** — `feature_flags` table exists with `global`/`workspace` scope but no read/write endpoint | Cannot test feature-flag-gated paths from the outside | Managed via Supabase Studio in MVP; no external test path |
| 7 | **Activity log read API absent** — `activity_log` table exists; writes are service_role only; no read endpoint | Audit trail not accessible to workspace members | No confirmed plan; flag as observability gap |
| 8 | **External story sync unimplemented** — `user_stories.external_id` and `external_url` fields exist; no Jira/GitHub sync endpoint or webhook found | Stories are created standalone; no bidirectional Jira link | Phase N feature; no endpoint to test against |
| 9 | **PAT workspace-scoping not verified at API layer** — `access_tokens.workspace_id` allows workspace-scoping but no route handler code was found enforcing that a workspace-scoped PAT cannot access other workspaces | Potential privilege-scope overshoot | Read `lib/api/middleware/bearer.ts` BearerContext usage in workspace-specific routes |
| 10 | **No HTTP security headers** — `next.config.ts` has no `headers()` function; CSP, HSTS, X-Frame-Options absent | XSS / clickjacking surface; not a data-flow gap but a critical NFR gap | Add `headers()` to `next.config.ts`; verified in `SRS/non-functional-specs.md §NFR-SEC` |
| 11 | **No rate limiting on auth endpoints** — `/api/v1/auth/magic-link` and `/api/v1/auth/signin` have no application-layer rate limit; Supabase upstream passthrough only | Magic-link spam vector; comment in code says "Phase F adds real rate-limit middleware" | Implement Upstash Redis or Vercel Edge Config rate limiter |
| 12 | **Supabase Storage unused — but no confirmation attachments are out of scope** | If evidence screenshots or ATC attachments are planned, Storage would be the natural integration | Check product roadmap |
| 13 | **`user_view_state.view_kind` values undocumented** — column exists, no CHECK constraint, no enum | Cannot determine valid values from code alone | Read components that write to this table (likely `Sidebar.tsx` or project page) |
| 14 | **No CI/CD pipeline in target repo** — no `.github/workflows/` | No automated type-check, lint, or test on push to target repo | Set up GitHub Actions; blocks automated regression testing in CI |

---

*Owned by: `/business-data-map` command. Next: run `/business-feature-map` for feature catalog, then `/master-test-plan` for risk-ranked test roadmap.*
