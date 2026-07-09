# Business Model — Bunkai

> Confidence: High
>
> Evidence quality: Strong — schema is authoritative (12 migrations), API routes are fully implemented with Zod validation, `app/qa/qa-config.ts` explicitly documents product intent, `DESIGN.md` documents product philosophy. README is the agentic-dev-boilerplate README (not Bunkai-specific), but the codebase itself is the primary signal.

---

## 1. Problem Statement

QA teams managing large test suites lack a structured, developer-native tool for authoring, organizing, and tracing Acceptance Test Cases (ATCs) back to the user stories and acceptance criteria that motivated them. Most existing Test Management Systems are either too heavy (enterprise Jira-Xray), too generic (spreadsheets), or disconnected from code workflows.

Source: `DESIGN.md` §1 — "QAs manage hundreds of ATCs daily. Spacing exists to clarify, not to relax." and "developer-first, opinionated about quality". Source: `supabase/migrations/0003_authoring.sql` comment — "Stories are the unit of business intent anchored to a Module. Each story has N sortable acceptance criteria (AC). ATCs in 0004 link to AC via a M:N table to satisfy the anchoring moat (an ATC must reference at least one AC)."

Bunkai (分解 — Japanese: "decomposition/analysis") specifically solves the traceability gap: every ATC is structurally required to reference at least one Acceptance Criterion, enforcing that no test case exists without a business justification. This is the product's core architectural moat.

Source: `supabase/migrations/0004_atcs.sql` comment — "bound to ≥1 acceptance criterion via `atc_acceptance_criteria` (the anchoring moat — enforced at the application layer in MVP, made structural by FK)."

The product targets teams operating with multi-tenant isolation (multiple independent QA teams using the same platform), three permission tiers (viewer / member / admin / owner), and three test-case layer classifications (UI, API, Unit). The platform also supports CLI and AI-agent access via Personal Access Tokens (PATs), indicating an automation-first, programmatic-access philosophy.

Source: `supabase/migrations/0001_tenancy.sql`, `supabase/migrations/0008_access_tokens.sql`, `lib/types.ts`, `app/qa/qa-config.ts`.

---

## 2. Business Model Canvas

### Customer Segments

| Segment | Description | Found In |
|---------|-------------|----------|
| QA Engineers | Individual testers who author ATCs, run tests, and manage test results | `supabase/migrations/0001_tenancy.sql` (member role), `DESIGN.md` §2 ("QAs manage hundreds of ATCs daily") |
| QA Leads / Managers | Workspace admins who control team membership and project access | `supabase/migrations/0001_tenancy.sql` (admin/owner roles) |
| Development Teams | Members who may view test results and link ATCs to stories | `lib/types.ts` (MemberRole: viewer, member, admin, owner) |
| AI Agents / CI Systems | Headless consumers using Bearer PAT authentication | `supabase/migrations/0008_access_tokens.sql`, `lib/api/pat.ts`, `app/qa/qa-config.ts` §api.patScopes |

### Value Propositions

| Proposition | Description | Found In |
|-------------|-------------|----------|
| Traceability enforcement | Every ATC structurally requires at least one Acceptance Criterion — no orphan test cases | `supabase/migrations/0004_atcs.sql` (`atc_acceptance_criteria` table, "anchoring moat") |
| Multi-tenant organization | Teams isolated by workspace with RBAC (viewer/member/admin/owner) | `supabase/migrations/0001_tenancy.sql` |
| Developer-native interface | VS Code-inspired dense UI, keyboard-first, command palette, monospace IDs | `DESIGN.md` §1–§6 |
| Three-layer test classification | UI / API / Unit layer chips — maps directly to automation stack | `supabase/migrations/0004_atcs.sql` (`layer` check constraint), `DESIGN.md` §3.6 |
| Full-text search on ATCs | GIN-indexed `tsv` column on `atcs` for tag-prefix and fuzzy queries | `supabase/migrations/0004_atcs.sql` (`atcs_tsv_gin_idx`) |
| Headless / AI-agent access | PAT-based bearer auth with fine-grained scopes (`atc:read`, `atc:write`, `run:execute`, `workspace:admin`) | `supabase/migrations/0008_access_tokens.sql`, `lib/api/pat.ts` |
| Invite-based team onboarding | Workspace invites with token-hash security + 7-day expiry | `supabase/migrations/0010_workspace_invites.sql` |

### Channels

| Channel | Description | Found In |
|---------|-------------|----------|
| Web application | Primary UI — Next.js app router at `upexbunkai.vercel.app` | `app/(app)/` routes, `.agents/project.yaml` |
| REST API | Programmatic access via `/api/v1/*` endpoints | `app/api/v1/` directory |
| Magic-link email | Passwordless user onboarding / login | `app/api/v1/auth/magic-link/route.ts`, `supabase/migrations/0009_cross_cutting.sql` (`magic_link_tokens`) |

### Customer Relationships

| Type | Description | Found In |
|------|-------------|----------|
| Self-service (web) | Users sign up via magic-link, create workspaces, invite teammates | `app/(auth)/login/`, `app/(app)/onboarding/`, `app/api/v1/auth/` |
| Automated (API/agents) | CI systems and AI agents operate headlessly via PAT | `lib/api/pat.ts`, `app/qa/qa-config.ts` |
| Invitation-gated teams | Team members join only via explicit workspace invite | `supabase/migrations/0010_workspace_invites.sql`, `app/api/v1/invites/accept/` |

### Revenue Streams

| Stream | Description | Found In |
|--------|-------------|----------|
| Plan tiers (inferred) | `community`, `cloud`, `enterprise` plans on workspaces — gating logic not yet implemented in MVP | `supabase/migrations/0001_tenancy.sql` (`plan` CHECK constraint on `workspaces`) |

> Note: No payment provider (Stripe, Paddle, LemonSqueezy) found in `package.json` or source. Revenue model is architectural intent — not yet implemented in observed code. Mark as Medium-confidence.

### Key Resources

| Resource | Description | Found In |
|----------|-------------|----------|
| Supabase PostgreSQL database | Stores all workspace, project, ATC, story, and invite data | `supabase/migrations/0001–0012` |
| Vercel deployment | Hosts the Next.js application | `.agents/project.yaml` `webapp_domain`, `staging` env |
| Supabase Auth | Magic-link + email/password authentication | `middleware.ts`, `lib/supabase/server.ts`, `app/api/v1/auth/` |
| RLS security model | Multi-tenant data isolation via PostgreSQL Row-Level Security | `supabase/migrations/0001–0012` (every table has RLS enabled) |

### Key Activities

| Activity | Description | Found In |
|----------|-------------|----------|
| ATC authoring | Create/edit ATCs with steps, assertions, tags, layer classification | `components/atcs/AtcEditor.tsx`, `lib/api/handler.ts`, `supabase/migrations/0004_atcs.sql` |
| ATC anchoring to stories/AC | Bind ATCs to user stories and acceptance criteria (enforced) | `supabase/migrations/0004_atcs.sql` (`atc_acceptance_criteria` M:N) |
| Project & module management | Hierarchical module tree (max depth 6) organizing ATCs within projects | `supabase/migrations/0002_projects_modules.sql`, `lib/tree.ts` |
| Workspace management | Invite teammates, manage roles, switch active workspace | `app/(app)/workspaces/`, `app/api/v1/workspaces/`, `app/api/v1/invites/` |
| API / headless access | PAT minting and scope-gated API consumption for CI/AI | `app/api/v1/tokens/`, `lib/api/pat.ts` |
| Full-text ATC search | Search ATCs by title and tags via GIN index | `supabase/migrations/0004_atcs.sql` (tsv + trigger) |

### Key Partners

| Partner | Role | Found In |
|---------|------|----------|
| Supabase | Database + Auth + hosting provider | `@supabase/supabase-js ^2.106.0`, `@supabase/ssr ^0.10.3`, `package.json` |
| Vercel | Deployment platform | `.agents/project.yaml` `webapp_domain` |
| Radix UI | Accessible UI primitives | `@radix-ui/*` packages in `package.json` |
| Atlassian / Jira | Issue tracker for backlog (external, not in-product) | `.agents/project.yaml` `issue_tracker`, `atlassian_url` |

### Cost Structure

| Cost | Category | Found In |
|------|----------|----------|
| Supabase hosting | Database + auth compute | `package.json` (`SUPABASE_ACCESS_TOKEN` in `.env.example`) |
| Vercel hosting | Frontend/edge compute | `.agents/project.yaml` |
| Development tooling | Bun, TypeScript, ESLint, Husky, Prettier | `package.json` devDependencies |

---

## 3. Discovery Gaps

- [ ] **Revenue model implementation** — `plan` field has `community/cloud/enterprise` values but no feature-gating or payment logic found in observed code. Business rules per plan are unknown.
- [ ] **`run:execute` scope** — PAT scope exists (`supabase/migrations/0008_access_tokens.sql`) and is documented in `app/qa/qa-config.ts`, but no `/api/v1/runs` endpoint was found. Test execution / run reporting is a planned feature not yet implemented.
- [ ] **User story external integration** — `user_stories.external_id` + `external_url` fields exist (migration 0003) suggesting Jira/GitHub issue linking, but no sync endpoint was found.
- [ ] **Feature flags system** — `feature_flags` table exists (`supabase/migrations/0009_cross_cutting.sql`) with `global` and `workspace` scope; no UI or API endpoint for flag management was found (service_role-only in MVP).
- [ ] **Activity log usage** — `activity_log` table exists (`supabase/migrations/0009_cross_cutting.sql`) but no read endpoint was found for users.
- [ ] **Pricing page / marketing site** — No landing page or pricing UI found in `app/` routes.

---

## 4. QA Relevance

| Business Aspect | Testing Implication |
|----------------|---------------------|
| Multi-tenancy + RLS | CRITICAL: cross-tenant isolation must be verified — user B cannot see user A's workspace data |
| RBAC (viewer/member/admin/owner) | Each role must be tested for correct permission boundaries on all CRUD operations |
| ATC anchoring moat | Attempting to save an ATC without linking ≥1 AC must fail (validation at API + DB layer) |
| Magic-link auth (passwordless) | Browser tests cannot intercept OTP tokens — use `login-email` + `login-submit` testids, assert "Check your inbox" state |
| PAT scopes (`atc:read`, `atc:write`, `run:execute`, `workspace:admin`) | Each scope must be tested as both permitted and denied |
| Invite flow (7-day expiry, single-use token) | Test acceptance, expiry, and replay prevention |
| Workspace slug uniqueness + reserved slugs | Validation boundary tests: duplicate slug → 409, reserved slug → 422 |
| Full-text search (GIN index) | ATC search by title and tag-prefix must return correct results |
| Token secret isolation (migrations 0011/0012) | QA roles must NOT be able to read `access_token_secrets`, `magic_link_token_secrets`, `workspace_invite_secrets` |

---

## 5. Sources Used

| File | Lines / Section | Used For |
|------|-----------------|----------|
| `supabase/migrations/0001_tenancy.sql` | Full file | Tenancy model, workspace plans, RBAC roles/statuses |
| `supabase/migrations/0002_projects_modules.sql` | Full file | Projects, modules tree structure (max depth 6) |
| `supabase/migrations/0003_authoring.sql` | Full file | user_stories, acceptance_criteria tables |
| `supabase/migrations/0004_atcs.sql` | Full file | ATC schema, layer/status enums, anchoring M:N, full-text search |
| `supabase/migrations/0008_access_tokens.sql` | Full file | PAT schema, scopes, token prefix/hash pattern |
| `supabase/migrations/0009_cross_cutting.sql` | Full file | idempotency_keys, activity_log, feature_flags, user_view_state, magic_link_tokens |
| `supabase/migrations/0010_workspace_invites.sql` | Full file | Invite flow, 7-day expiry, token_hash |
| `supabase/migrations/0011_split_token_secrets.sql` | Full file | Secret isolation pattern, QA role revocation |
| `supabase/migrations/0012_drop_legacy_token_hashes.sql` | Full file | Legacy column cleanup |
| `lib/types.ts` | Full file | TypeScript entity types, enums |
| `lib/api/pat.ts` | Full file | PAT minting logic, `bk_pat_<prefix>.<secret>` format |
| `app/qa/qa-config.ts` | qaConfig object | Stack confirmation, auth methods, PAT scopes, API endpoints, DB roles |
| `DESIGN.md` | §1–§3.6 | Brand identity, design principles, product philosophy |
| `app/api/v1/workspaces/route.ts` | Full file | Workspace creation validation, reserved slugs |
| `.agents/project.yaml` | Full file | Project vars, environments, stack |
| `lib/env.ts` | Full file | Required environment variables |
| `middleware.ts` | Full file | Auth routing, protected/public routes |
