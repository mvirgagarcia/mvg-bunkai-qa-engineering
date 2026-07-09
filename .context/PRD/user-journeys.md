# PRD — User Journeys

> Product: Bunkai TMS
> Phase: 2 — Architecture
> Generated: 2026-05-31
> Mindset: Routes are journey steps. Every step cites a file.

---

## 1. Route Map

### Public Routes (Unauthenticated)

| Route | Page | Purpose |
|-------|------|---------|
| `/` | `app/page.tsx` | Root — immediately redirects to `/login` |
| `/login` | `app/(auth)/login/page.tsx` | Magic-link send form + OAuth buttons (disabled) |
| `/auth/callback` | `app/auth/callback/route.ts` | Supabase OTP exchange — receives `?code=` from email link |
| `/invites/accept` | `app/invites/accept/page.tsx` | Invite redemption landing — receives `?token=` |
| `/api/v1/health` | `app/api/v1/health/route.ts` | Liveness probe — no auth required |
| `/api/openapi` | `app/api/openapi/route.ts` | Static OpenAPI JSON spec |
| `/api/docs` | `app/api/docs/page.tsx` | Scalar UI for the OpenAPI spec |
| `/api/v1/auth/magic-link` | API route handler | POST: send magic-link OTP email |
| `/api/v1/auth/signup` | API route handler | POST: headless user provisioning + PAT mint |
| `/api/v1/auth/signin` | API route handler | POST: headless password signin + PAT mint |

Source: `middleware.ts:9` `PUBLIC_PREFIXES`, `app/` directory structure

### Protected Routes (Authenticated)

| Route | Page | Requires | Purpose |
|-------|------|----------|---------|
| `/onboarding` | `app/(app)/onboarding/page.tsx` | Session (any role) | Create first workspace — shown when user has no active membership |
| `/projects` | `app/(app)/projects/page.tsx` | Session + active membership | Index — redirects to first project or empty state |
| `/projects/{projectSlug}` | `app/(app)/projects/[projectSlug]/page.tsx` | Session + workspace membership | ATC list + sidebar for a project |
| `/projects/{projectSlug}/atcs/{atcId}` | `app/(app)/projects/[projectSlug]/atcs/[atcId]/page.tsx` | Session + workspace membership | ATC editor with steps/assertions/anchoring |
| `/workspaces/{id}/members` | `app/(app)/workspaces/[id]/members/page.tsx` | Session + workspace membership | Members list + invite form |

Source: `middleware.ts:8` `PROTECTED_PREFIXES`, page files with `redirect('/login')` guards

### Dynamic Routes

| Pattern | Example | Purpose |
|---------|---------|---------|
| `/projects/[projectSlug]` | `/projects/bunkai-tms` | Project ATC list — slug lookup via RLS-filtered SELECT |
| `/projects/[projectSlug]/atcs/[atcId]` | `/projects/bunkai-tms/atcs/uuid-here` | ATC editor — UUID lookup scoped to project |
| `/workspaces/[id]/members` | `/workspaces/uuid-here/members` | Members/invites management — UUID parameter |
| `/api/v1/workspaces/[id]` | `/api/v1/workspaces/uuid` | REST workspace CRUD |
| `/api/v1/workspaces/[id]/invites` | `/api/v1/workspaces/uuid/invites` | REST invite list/create |
| `/api/v1/workspaces/[id]/invites/[inviteId]` | `/api/v1/workspaces/uuid/invites/uuid` | REST invite rotate/revoke |
| `/api/v1/tokens/[id]` | `/api/v1/tokens/uuid` | REST PAT revocation |

---

## 2. Journey 1: Magic-Link Login and First-Time Workspace Setup

**Persona:** New User (becomes Owner)
**Goal:** Get from zero to a workspace they own
**Discovered From:** `app/(auth)/login/page.tsx`, `app/auth/callback/route.ts`, `app/(app)/onboarding/onboarding-form.tsx`, `app/(app)/projects/page.tsx`

```mermaid
flowchart LR
    A(["/login"]) --> B["Enter email\ndata-testid=login-email"]
    B --> C["Click 'Send magic link'\ndata-testid=login-submit"]
    C --> D["POST /api/v1/auth/magic-link\n→ Supabase signInWithOtp"]
    D --> E["'Check your inbox' state\nUI feedback"]
    E --> F["User clicks email link\nexternal action"]
    F --> G["GET /auth/callback?code=..."]
    G --> H{Code valid?}
    H -->|Yes| I["exchangeCodeForSession\n→ session cookie set"]
    H -->|No| J["/login?error=otp_exchange_failed"]
    I --> K["/projects (redirect)"]
    K --> L{Has active\nmembership?}
    L -->|No| M["/onboarding"]
    L -->|Yes| N["/projects/{slug}"]
    M --> O["Fill workspace name + slug\nPOST /api/v1/workspaces"]
    O --> P{slug valid &\nnot reserved?}
    P -->|No| Q["Toast error — slug taken/reserved"]
    P -->|Yes| R["Workspace created\nowner membership auto-enrolled"]
    R --> N
```

### Step-by-Step Flow

| Step | Page | Action | Next | Evidence |
|------|------|--------|------|----------|
| 1 | `/login` | Render magic-link form | — | `app/(auth)/login/page.tsx:14` |
| 2 | `/login` | User enters email → clicks "Send magic link" | POST `/api/v1/auth/magic-link` | `app/(auth)/login/magic-link-form.tsx:26–49` |
| 3 | `/api/v1/auth/magic-link` | Validate email, call `supabase.auth.signInWithOtp`, record issuance in `magic_link_tokens` | Return `{ok:true}` | `app/api/v1/auth/magic-link/route.ts:33–61` |
| 4 | `/login` | Show "Check your inbox" confirmation state | Wait for user | `app/(auth)/login/magic-link-form.tsx:51–70` |
| 5 | Email client | User clicks magic link | `GET /auth/callback?code=...&next=/projects` | External — no evidence in code |
| 6 | `/auth/callback` | Exchange OTP code → session cookie set | Redirect to `safeNext` | `app/auth/callback/route.ts:23–32` |
| 7 | `/projects` | Check active membership | Redirect to `/onboarding` if none | `app/(app)/projects/page.tsx:22–27` |
| 8 | `/onboarding` | Confirm user has no workspace, render form | — | `app/(app)/onboarding/page.tsx:14–21` |
| 9 | `/onboarding` | User fills name + slug → submit → `POST /api/v1/workspaces` | On success: redirect to `/projects` | `app/(app)/onboarding/onboarding-form.tsx:36–63` |
| 10 | `/api/v1/workspaces` | Validate slug, call `bunkai_bootstrap_workspace` RPC | Return `{workspace}` 201 | `app/api/v1/workspaces/route.ts:55–97` |
| 11 | `/projects` | Find first project → redirect | Empty state if no projects | `app/(app)/projects/page.tsx:32–38` |

### Error Paths

| Error | Handling | Evidence |
|-------|----------|----------|
| Magic-link rate limited by Supabase | 429 returned to client; toast: "upstream error" or Supabase message | `app/api/v1/auth/magic-link/route.ts:45–50` |
| OTP code missing on callback | Redirect to `/login?error=missing_code` | `app/auth/callback/route.ts:14–17` |
| OTP exchange fails | Redirect to `/login?error=otp_exchange_failed&reason=...` | `app/auth/callback/route.ts:27–30` |
| Open-redirect attempt (`?next=//evil.com`) | Clamped to `/projects` | `app/auth/callback/route.ts:17–19` |
| Workspace slug reserved | Toast: `"Slug is reserved."` / 422 | `app/api/v1/workspaces/route.ts:51` |
| Workspace slug taken | Toast: `"Slug \"x\" is taken — try another."` / 409 | `app/(app)/onboarding/onboarding-form.tsx:50` |

### Success Criteria

- [ ] User receives magic-link email within expected timeframe
- [ ] `/auth/callback?code=valid` sets session cookie and redirects to `/projects`
- [ ] `/projects` redirects unenrolled user to `/onboarding`
- [ ] Workspace creation succeeds with valid slug → user lands on `/projects`
- [ ] User is auto-enrolled as `owner` in the new workspace

---

## 3. Journey 2: ATC Authoring (Core Flow)

**Persona:** QA Engineer (member)
**Goal:** Create a new ATC with steps, assertions, and at least one AC anchor
**Discovered From:** `app/(app)/projects/[projectSlug]/atcs/[atcId]/page.tsx`, `components/atcs/AtcEditor.tsx`, `app/(app)/projects/[projectSlug]/atcs/[atcId]/actions.ts`

```mermaid
flowchart LR
    A(["/projects/{slug}"]) --> B["ATC list table\nAtcTable component"]
    B --> C["Click 'New ATC' button\n(or click existing ATC)"]
    C --> D["/projects/{slug}/atcs/{id}"]
    D --> E["AtcEditor renders\nStepEditor (Monaco) + AnchoringPanel"]
    E --> F["Fill title, select layer UI/API/Unit\nadd tags"]
    F --> G["Write steps in Markdown\nwrite assertions in YAML"]
    G --> H["Select user story\nfrom AnchoringPanel dropdown"]
    H --> I["Select ≥1 AC\nfrom story's AC list"]
    I --> J["Click Save"]
    J --> K{All validations\npass?}
    K -->|No| L["Error toast:\n'Bind to user story' OR\n'Bind at least one AC' OR\n'Title is required'"]
    K -->|Yes| M["saveAtcAction server action\n→ bunkai_save_atc RPC"]
    M --> N{RPC success?}
    N -->|Yes| O["revalidatePath + success toast"]
    N -->|No| P["Error toast with server message"]
```

### Step-by-Step Flow

| Step | Page | Action | Next | Evidence |
|------|------|--------|------|----------|
| 1 | `/projects/{slug}` | View ATC list — AtcTable renders all ATCs for project | — | `app/(app)/projects/[projectSlug]/page.tsx:116` |
| 2 | `/projects/{slug}` | Click ATC link → navigate | `/projects/{slug}/atcs/{id}` | `components/layout/Sidebar.tsx:134–155` |
| 3 | `/projects/{slug}/atcs/{id}` | Server fetches ATC, steps, assertions, bound ACs, all stories, all ACs for project | Render AtcEditor | `app/(app)/projects/[projectSlug]/atcs/[atcId]/page.tsx:40–85` |
| 4 | Editor | Edit title field | State update | `components/atcs/AtcEditor.tsx:73` |
| 5 | Editor | Click layer chip (UI/API/Unit) | State update | `components/atcs/AtcEditor.tsx:57 LAYERS` |
| 6 | Editor | Type tags + press Enter | Tags array state update | `components/atcs/AtcEditor.tsx:77` |
| 7 | Editor | Write steps in Monaco (Markdown) | `stepsMd` state | `components/atcs/StepEditor.tsx` (Monaco editor) |
| 8 | Editor | Write assertions in Monaco (YAML) | `assertionsMd` state | `components/atcs/AtcEditor.tsx:80` |
| 9 | AnchoringPanel | Select user story from dropdown | Sets `storyId` | `components/atcs/AnchoringPanel.tsx` |
| 10 | AnchoringPanel | Check ≥1 AC checkbox | `acIds` array updated | `components/atcs/AnchoringPanel.tsx` |
| 11 | Editor | Click Save button | `saveAtcAction` invoked | `components/atcs/AtcEditor.tsx:54` |
| 12 | Server action | Validate inputs, parse Markdown/YAML, call `bunkai_save_atc` RPC | `{ok:true}` or `{ok:false,error}` | `app/(app)/projects/[projectSlug]/atcs/[atcId]/actions.ts:24–53` |
| 13 | Server action | On success: `revalidatePath` for project + ATC pages | Page refresh | `actions.ts:51–52` |

### Error Paths

| Error | Handling | Evidence |
|-------|----------|----------|
| No user story selected | `{ok:false, error:'Bind to a user story before saving.'}` | `actions.ts:26–28` |
| No AC selected | `{ok:false, error:'Bind at least one acceptance criterion.'}` | `actions.ts:29–31` |
| Empty title | `{ok:false, error:'Title is required.'}` | `actions.ts:32–34` |
| `bunkai_save_atc` RPC error | `{ok:false, error: error.message}` | `actions.ts:43–45` |
| ATC not found for project | `notFound()` — Next.js 404 | `app/(app)/projects/[projectSlug]/atcs/[atcId]/page.tsx:38` |

### Success Criteria

- [ ] ATC editor renders with Monaco editors for steps and assertions
- [ ] Save is blocked when no story is selected
- [ ] Save is blocked when no AC is selected
- [ ] Save with valid title + story + ≥1 AC completes successfully
- [ ] Page revalidates after save — updated ATC appears in sidebar

---

## 4. Journey 3: Headless API Access (CI / AI Agent)

**Persona:** CI / AI Agent
**Goal:** Provision headless credentials and access the API with a PAT
**Discovered From:** `app/api/v1/auth/signup/route.ts`, `app/api/v1/auth/signin/route.ts`, `lib/api/middleware/bearer.ts`, `app/qa/qa-config.ts`

```mermaid
flowchart LR
    A["POST /api/v1/auth/signup\nemail + password"] --> B{Email already\nexists?}
    B -->|Yes| C["409 Conflict\nuse /auth/signin instead"]
    B -->|No| D["admin.auth.createUser\nemail_confirm:true"]
    D --> E["signInWithPassword\n→ session tokens"]
    E --> F["mintPat\n→ bk_pat_prefix.secret"]
    F --> G["Return {user, session, pat}\n201 Created"]
    G --> H["Store PAT securely\n(shown once only)"]
    H --> I["API calls with\nAuthorization: Bearer bk_pat_xxx.yyy"]
    I --> J["requireBearerToken\nprefix lookup → hash verify"]
    J --> K{Valid &\nnot revoked?}
    K -->|Yes| L["Return BearerContext\n{userId, workspaceId, scopes}"]
    K -->|No| M["401 Unauthorized\n(uniform — no detail)"]
    L --> N["GET /api/v1/me\n→ {user, workspaces, active_workspace_id}"]
```

### Step-by-Step Flow

| Step | Page | Action | Next | Evidence |
|------|------|--------|------|----------|
| 1 | CLI / CI | `POST /api/v1/auth/signup {email, password, pat_scopes}` | — | `app/api/v1/auth/signup/route.ts:25` |
| 2 | `/api/v1/auth/signup` | Validate body via Zod schema | Continue or 422 | `app/api/v1/auth/signup/route.ts:17–23` |
| 3 | `/api/v1/auth/signup` | `admin.auth.createUser` with `email_confirm:true` | User created without confirmation email | `app/api/v1/auth/signup/route.ts:36–48` |
| 4 | `/api/v1/auth/signup` | `signInWithPassword` → session tokens | Session populated | `app/api/v1/auth/signup/route.ts:52–59` |
| 5 | `/api/v1/auth/signup` | `mintPat` → raw token `bk_pat_<prefix>.<secret>` | PAT row + secret hash stored | `lib/api/pat.ts:40–83` |
| 6 | `/api/v1/auth/signup` | Return `{user, session, pat}` 201 — raw PAT shown ONCE | Agent stores PAT | `app/api/v1/auth/signup/route.ts:70–88` |
| 7 | CLI / CI | `GET /api/v1/me` with `Authorization: Bearer bk_pat_xxx.yyy` | Introspect identity | `app/api/v1/me/route.ts:21` |
| 8 | `requireBearerToken` | Extract prefix, query `access_tokens` by `token_prefix`, verify SHA-256 hash | Return `BearerContext` | `lib/api/middleware/bearer.ts:44–113` |
| 9 | `/api/v1/me` | Build workspace list via admin client (no RLS for Bearer) | Return `{user, workspaces, active_workspace_id}` | `app/api/v1/me/route.ts:44–58` |

### Error Paths

| Error | Handling | Evidence |
|-------|----------|----------|
| Email already registered | 409 — "A user with email {email} already exists." | `app/api/v1/auth/signup/route.ts:44–46` |
| Invalid email/password on signin | 401 — "Invalid email or password." (uniform — no leak) | `app/api/v1/auth/signin/route.ts:33–36` |
| Missing Authorization header | 401 — "Missing or invalid Authorization header." | `lib/api/middleware/bearer.ts:32` |
| Wrong token format (not `bk_pat_`) | 401 — "Invalid token." | `lib/api/middleware/bearer.ts:36–38` |
| Revoked PAT | 401 — "Invalid token." (uniform) | `lib/api/middleware/bearer.ts:93–95` |
| Expired PAT | 401 — "Invalid token." (uniform) | `lib/api/middleware/bearer.ts:95` |
| Scope not present for endpoint | 403 — "Token missing required scope: {scope}" | `lib/api/middleware/bearer.ts:116–119` |

### Success Criteria

- [ ] `POST /api/v1/auth/signup` returns 201 with raw PAT token
- [ ] Second call with same email returns 409 (idempotency: use signin instead)
- [ ] `GET /api/v1/me` with valid PAT returns user + workspaces
- [ ] Revoked PAT returns 401 on next call
- [ ] Scoped PAT (`atc:read`) blocked from write endpoints with 403

---

## 5. Journey 4: Invite Acceptance

**Persona:** New team member (invitee)
**Goal:** Join an existing workspace via invite link
**Discovered From:** `app/invites/accept/page.tsx`, `app/invites/accept/accept-client.tsx`, `app/api/v1/invites/accept/route.ts`

```mermaid
flowchart LR
    A["Invitee receives accept_url\n/invites/accept?token=xyz"] --> B["/invites/accept page\nAcceptClient renders"]
    B --> C{User\nsigned in?}
    C -->|No| D["/login?next=/invites/accept?token=xyz"]
    D --> E["Login flow → back to accept page"]
    C -->|Yes| F["POST /api/v1/invites/accept\n{token}"]
    F --> G["Hash token → lookup in\nworkspace_invite_secrets"]
    G --> H{Token\nvalid?}
    H -->|Not found| I["404 Invite token is invalid"]
    H -->|Revoked| J["409 Invite has been revoked"]
    H -->|Already accepted| K["409 Invite has already been accepted"]
    H -->|Expired| L["409 Invite has expired"]
    H -->|Email mismatch| M["403 This invite was sent to a different email"]
    H -->|Valid| N["Upsert workspace_members\nstatus=active, role=invite.role"]
    N --> O["Stamp accepted_at on invite"]
    O --> P["Return {ok:true, workspace_id, role}"]
    P --> Q["Client redirects to /projects"]
```

### Step-by-Step Flow

| Step | Page | Action | Next | Evidence |
|------|------|--------|------|----------|
| 1 | Email/chat | Invitee opens `accept_url` from invite issuer | `/invites/accept?token=raw_token` | `app/api/v1/workspaces/[id]/invites/route.ts:74` |
| 2 | `/invites/accept` | Server renders AcceptClient with `token` prop | Client loads | `app/invites/accept/page.tsx:10–19` |
| 3 | Client | Check if user is signed in (via auth context or redirect) | If not: redirect to `/login?next=...` | `components/providers/auth-context.tsx` (inferred — exact implementation not read) |
| 4 | `/api/v1/invites/accept` | `POST {token}` — hash token, lookup in `workspace_invite_secrets` | Resolve invite | `app/api/v1/invites/accept/route.ts:20–50` |
| 5 | `/api/v1/invites/accept` | Validate invite: not revoked, not accepted, not expired, email matches caller | Continue or error | `app/api/v1/invites/accept/route.ts:62–73` |
| 6 | `/api/v1/invites/accept` | Upsert `workspace_members` (promotes `invited` → `active` if existing row) | Membership active | `app/api/v1/invites/accept/route.ts:76–89` |
| 7 | `/api/v1/invites/accept` | Stamp `accepted_at` on invite | One-time use confirmed | `app/api/v1/invites/accept/route.ts:91–100` |
| 8 | Client | Redirect to `/projects` (or `?next=` param) | User is now a workspace member | `app/invites/accept/page.tsx:11` `nextPath` prop |

### Error Paths

| Error | Handling | Evidence |
|-------|----------|----------|
| Invalid / unknown token | 404 — "Invite token is invalid." | `app/api/v1/invites/accept/route.ts:52–54` |
| Revoked invite | 409 — "Invite has been revoked." | `route.ts:62–64` |
| Already accepted | 409 — "Invite has already been accepted." | `route.ts:65–67` |
| Expired (>7 days) | 409 — "Invite has expired." | `route.ts:68–70` |
| Email mismatch | 403 — "This invite was sent to a different email address." | `route.ts:71–73` |

### Success Criteria

- [ ] Valid invite token + signed-in user with matching email → workspace membership created
- [ ] `workspace_members.status = 'active'` and `role` matches invite role
- [ ] `workspace_invites.accepted_at` is stamped
- [ ] Second acceptance attempt returns 409
- [ ] Expired invite returns 409
- [ ] Token replay after acceptance returns 409

---

## 6. Journey 5: PAT Lifecycle (Issue, Use, Revoke)

**Persona:** QA Engineer (member) or CI/Agent
**Goal:** Issue a PAT from the web UI, use it in API calls, revoke it when done
**Discovered From:** `app/api/v1/tokens/route.ts`, `app/api/v1/tokens/[id]/route.ts`, `lib/api/pat.ts`

```mermaid
flowchart LR
    A["POST /api/v1/tokens\n{name, scopes, workspace_id?}"] --> B["Generate 32-byte random secret\ntoken_prefix = first 12 chars"]
    B --> C["Insert access_tokens row\nInsert access_token_secrets row (SHA-256)"]
    C --> D["Return raw token ONCE\nbk_pat_prefix.remainder"]
    D --> E["API calls with Bearer header\nrequireBearerToken verifies hash"]
    E --> F["Access granted or 403 scope check"]
    F --> G["touchLastUsed (fire-and-forget)"]
    G --> H["DELETE /api/v1/tokens/{id}\nSet revoked_at = now()"]
    H --> I["204 No Content\ntoken rejected on next Bearer call"]
```

### Step-by-Step Flow

| Step | Page | Action | Next | Evidence |
|------|------|--------|------|----------|
| 1 | Client | `POST /api/v1/tokens {scopes:['atc:read',...]}` | — | `app/api/v1/tokens/route.ts:32` |
| 2 | `/api/v1/tokens` | Session auth check, Zod validation | Continue | `app/api/v1/tokens/route.ts:33–50` |
| 3 | `/api/v1/tokens` | `generateSecret(32)` → `tokenPrefix` (first 12) + `sha256Hex(secret)` | Two rows inserted | `app/api/v1/tokens/route.ts:46–77` |
| 4 | `/api/v1/tokens` | Return `{id, token:'bk_pat_...', scopes, expires_at}` 201 | Raw token shown ONCE | `app/api/v1/tokens/route.ts:83–96` |
| 5 | Client | `GET /api/v1/tokens` — list tokens (no secrets) | Returns metadata only | `app/api/v1/tokens/route.ts:98–119` |
| 6 | Any `/api/v1/*` | `Authorization: Bearer bk_pat_prefix.remainder` | `requireBearerToken` | `lib/api/middleware/bearer.ts:28` |
| 7 | `/api/v1/tokens/{id}` | `DELETE` — set `revoked_at = now()` | 204 | `app/api/v1/tokens/[id]/route.ts:18–52` |

### Error Paths

| Error | Handling | Evidence |
|-------|----------|----------|
| Zero scopes in request | 422 — Zod `z.array(...).min(1)` | `app/api/v1/tokens/route.ts:28` |
| Token already revoked | 404 — "Token not found or already revoked." | `app/api/v1/tokens/[id]/route.ts:44–47` |
| `GET /api/v1/tokens` unauthenticated | 401 | `app/api/v1/tokens/route.ts:99–103` |

### Success Criteria

- [ ] `POST /api/v1/tokens` returns raw token `bk_pat_prefix.remainder` in response
- [ ] `GET /api/v1/tokens` does NOT return the raw token — only metadata
- [ ] Bearer call with valid PAT succeeds (200/201/204 as appropriate)
- [ ] `DELETE /api/v1/tokens/{id}` returns 204 and next Bearer call with that token returns 401
- [ ] `access_token_secrets.hash` is never returned in any GET response

---

## 7. Navigation Structure

```mermaid
graph LR
    subgraph Public
        Login["/login"]
        Callback["/auth/callback"]
        Accept["/invites/accept"]
        Health["/api/v1/health"]
        Docs["/api/docs"]
    end

    subgraph Authenticated
        Root["/"] -->|redirect| Login
        Login -->|OTP success| Projects
        Callback -->|session set| Projects

        Projects["/projects"]
        Projects -->|no membership| Onboarding["/onboarding"]
        Projects -->|has projects| ProjectSlug["/projects/{slug}"]
        ProjectSlug --> AtcEditor["/projects/{slug}/atcs/{id}"]
        ProjectSlug --> Members["/workspaces/{id}/members"]
    end

    subgraph API
        APIV1["/api/v1/*"]
        Auth["/api/v1/auth/*"]
        Tokens["/api/v1/tokens"]
        Workspaces["/api/v1/workspaces"]
        Me["/api/v1/me"]
        Invites["/api/v1/invites/accept"]
    end

    Accept -->|POST token| Invites
    Onboarding -->|POST| Workspaces
    Members -->|POST| Workspaces
```

---

## 8. Breadcrumb Patterns

| Path | Breadcrumb | Evidence |
|------|-----------|----------|
| `/projects/{slug}` | `{workspace.name} · {project.name} · All ATCs` | `app/(app)/projects/[projectSlug]/page.tsx:87–89` `Breadcrumb` component |
| `/workspaces/{id}/members` | `Workspace · {workspace.slug}` (label) + `Members & invites` (h1) | `app/(app)/workspaces/[id]/members/page.tsx:44–50` |
| `/projects/{slug}/atcs/{id}` | Not yet confirmed — AtcEditor renders `modulePath` field | `components/atcs/AtcEditor.tsx:62` `modulePath` prop |

---

## 9. Critical Paths

### Happy Paths (Must Work)

| Journey | Start | End | Business Impact |
|---------|-------|-----|----------------|
| Magic-link signup + workspace creation | `/login` | `/projects` (workspace created) | Zero-to-product for new users |
| ATC creation with AC anchoring | `/projects/{slug}` | ATC saved with ≥1 AC | Core product value — traceability enforced |
| Invite acceptance | Email link | `/projects` (new membership active) | Team growth |
| Headless PAT provisioning | `POST /api/v1/auth/signup` | PAT stored + API calls succeeding | CI/AI agent automation |
| PAT revocation | `DELETE /api/v1/tokens/{id}` | 204 + 401 on next Bearer call | Security — token lifecycle |

### Unhappy Paths (Must Handle)

| Scenario | Expected Behavior | Evidence |
|----------|------------------|----------|
| OTP link clicked after expiry | `/login?error=otp_exchange_failed` | `app/auth/callback/route.ts:27–30` |
| `?next=//evil.com` open redirect | Clamped to `/projects` | `app/auth/callback/route.ts:17–19` |
| Workspace slug "login" | 422 "Slug is reserved." | `app/api/v1/workspaces/route.ts:51` |
| Invite token replay (accept twice) | 409 "Invite has already been accepted." | `app/api/v1/invites/accept/route.ts:65–67` |
| PAT with wrong scope on write endpoint | 403 "Token missing required scope: atc:write" | `lib/api/middleware/bearer.ts:116–119` |
| Viewer attempts to create ATC | 0 rows from RLS → API returns 403 | `supabase/migrations/0001_tenancy.sql` mutation policies |
| ATC save without AC selection | Blocked client-side + server-side: `"Bind at least one acceptance criterion."` | `actions.ts:29–31` |
| Cross-workspace data access | 0 rows from RLS (user not a member of target workspace) | `supabase/migrations/0001_tenancy.sql` RLS policies |

---

## 10. Discovery Gaps

| Flow | Unknown | Question |
|------|---------|---------|
| Invite acceptance — unauthenticated user path | `accept-client.tsx` full implementation not read — does it auto-redirect to login with `?next`? | Read `app/invites/accept/accept-client.tsx` fully |
| ATC creation (New ATC button) | "New ATC" button on project page is present in UI but no creation endpoint found in `app/api/` — only editing is implemented | Where does the ATC INSERT happen? Via RPC? Direct Supabase insert? |
| Project creation flow | "Project creation UI ships in Phase E" — no project CREATE endpoint found | What is the Phase E plan? |
| Module creation flow | No module creation UI or API found | Same as project creation — Phase E? |
| User story creation flow | No user story creation UI or API found | Is story authoring planned as UI or API-only? |
| Multi-workspace switcher | `WorkspaceSwitcher` component exists in Topbar — full implementation not read | Does workspace switching update `bk_active_ws` cookie via `POST /api/v1/me/active-workspace`? |
| Logout flow | No `/logout` route found — only `/login` and Supabase session management | How does a user log out? |

---

## 11. QA Relevance

### Critical E2E Test Scenarios

| Priority | Scenario | Journey Reference |
|----------|---------|------------------|
| P0 | Magic-link send + OTP callback → workspace landing | Journey 1 |
| P0 | ATC save blocked without AC selection | Journey 2 |
| P0 | Cross-tenant isolation: User B cannot read User A's workspace data | Unhappy Paths |
| P0 | PAT bearer auth: valid PAT succeeds, revoked PAT returns 401 | Journey 5 |
| P0 | Headless signup → PAT → `GET /api/v1/me` returns correct user | Journey 3 |
| P1 | Invite acceptance: valid token + matching email → active membership | Journey 4 |
| P1 | Invite replay prevention: second accept returns 409 | Journey 4 |
| P1 | Viewer role: all mutation attempts return 403 | Unhappy Paths |
| P1 | Workspace slug validation: reserved + duplicate | Journey 1 |
| P2 | PAT scope gating: `atc:read` PAT rejected on write endpoints | Journey 3 |
| P2 | Open-redirect guard on `/auth/callback` | Unhappy Paths |
| P2 | Invite expiry: invite older than 7 days returns 409 | Journey 4 |

### Suggested Test Data

| Journey | Test User | Prerequisites |
|---------|-----------|--------------|
| Journey 1 | `qa.bot@bunkai-test.dev` (magic-link flow) | Fresh Supabase staging project with no existing user |
| Journey 1 (headless) | Provision via `POST /api/v1/auth/signup` | Staging environment + `SUPABASE_SERVICE_ROLE_KEY` |
| Journey 2 | `member` role user in workspace with ≥1 project, ≥1 module, ≥1 story, ≥1 AC | Seed data fixture |
| Journey 3 | Fresh bot email (e.g., `ci-agent-{timestamp}@bunkai-test.dev`) | `POST /api/v1/auth/signup` — no precondition |
| Journey 4 | Two users: inviter (`admin`) + invitee (new user) | Inviter must be active member with `admin` role |
| Journey 5 | Any authenticated user | Existing session (cookie) |
