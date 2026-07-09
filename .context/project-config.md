# Project Configuration

> Project: Bunkai
> Generated: 2026-05-31

## Repositories

| Repository | URL | Branch | Purpose |
|------------|-----|--------|---------|
| upex-bunkai-tms (frontend + backend) | https://github.com/upex-galaxy/upex-bunkai-tms | main | Full-stack monorepo — Next.js app + Supabase backend |
| bunkai-qa-engineering (this repo) | — | main | QA automation framework (KATA + Playwright + TypeScript) |

Source: `app/qa/qa-config.ts` (backendRepo / frontendRepo fields, reposShape: 'mono')

## Tech Stack

### Frontend
- Framework: Next.js ^15 (App Router, typedRoutes enabled)
- Language: TypeScript ^5.9.3 (strict mode)
- Styling: Tailwind CSS ^3.4 + shadcn/ui (Radix UI primitives)
- State: No global state library — React Server Components + server actions
- UI components: Radix UI (dialog, dropdown-menu, tabs, tooltip) + lucide-react ^1.16.0
- Command palette: cmdk ^1.1.1
- Notifications: sonner ^2.0.7
- Code editor: @monaco-editor/react ^4.7.0
- Data tables: @tanstack/react-table ^8.21.3

Source: `package.json` dependencies

### Backend
- Framework: Next.js ^15 API Routes (app/api/ directory, route handlers)
- Language: TypeScript ^5.9.3
- ORM: None — direct Supabase JS SDK (@supabase/supabase-js ^2.106.0 + @supabase/ssr ^0.10.3)
- Validation: Zod ^4.4.3
- API documentation: @asteasolutions/zod-to-openapi ^8.5.0 + @scalar/api-reference-react ^0.9.38
- Auth: Supabase Auth (magic-link primary flow + email/password for headless/QA)
- PAT format: `bk_pat_<prefix>.<secret>` (SHA-256 hash in sibling table)

Source: `package.json`, `lib/env.ts`, `lib/api/pat.ts`, `app/api/v1/*/route.ts`

### Database
- Type: PostgreSQL (Supabase managed, PostgreSQL 17)
- Provider: Supabase (hosted)
- Schema: 12 migrations under `supabase/migrations/` — authoritative source
- Row-Level Security: enabled on all tables; SECURITY DEFINER helpers (`bunkai_is_workspace_member`, `bunkai_is_workspace_admin`, `bunkai_is_workspace_owner`, `bunkai_can_write_workspace`)
- Access (QA): DBHub MCP via `dbhub.toml`; roles `qa_inspector_ro` (SELECT) and `qa_inspector_rw` (SELECT/INSERT/UPDATE/DELETE), both BYPASSRLS
- Access (app): `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` (anon/RLS) + `SUPABASE_SERVICE_ROLE_KEY` (admin, server-only)

Source: `dbhub.toml`, `supabase/migrations/0001–0012`, `lib/env.ts`, `app/qa/qa-config.ts`

### Infrastructure
- Cloud: Vercel (deployment)
- Domain: upexbunkai.vercel.app (production), staging-upexbunkai.vercel.app (staging)
- CI/CD: None detected — no `.github/workflows/` directory exists in the target repo
- Monitoring: None detected
- Runtime: Bun >= 1.0.0 (scripts + package manager)

Source: `.agents/project.yaml`, repo root listing

## Environments

| Environment | URL | Purpose | Access |
|-------------|-----|---------|--------|
| Local | http://localhost:3000 | Development | Direct — `bun run dev` |
| Staging | https://staging-upexbunkai.vercel.app | Pre-prod QA testing | Public URL, Supabase staging project |
| Production | https://upexbunkai.vercel.app | Live product | Read-only for QA |

Source: `.agents/project.yaml` environments section

## Tools and Access

- Issue tracker: Jira Cloud — resolved via [ISSUE_TRACKER_TOOL] (`/acli`)
- Project key: BK
- Jira URL: https://upexgalaxy67.atlassian.net/
- Test management CLI: `bun xray` (Xray Cloud)
- Database: resolved via [DB_TOOL] — DBHub MCP (`dbhub.toml`, `DBHUB_*` env vars)
- API docs: Scalar UI at `/api/docs`; OpenAPI spec at `/api/openapi`
- Credentials source: Jira Epic BK-29 (passwords and secrets)
- Demo user: `qa.bot@bunkai-test.dev` (headless QA bot — provision via `POST /api/v1/auth/signup`)

Source: `.agents/project.yaml`, `app/qa/qa-config.ts`

## Access Checklist

- [x] Repository read access — local clone present at `/Users/micaela/Desktop/projects/upex/upex-bunkai-tms/`
- [ ] Database access (MCP) — DBHub MCP configured in `dbhub.toml`; requires `DBHUB_*` env vars populated from BK-29
- [x] Issue tracker — Jira at https://upexgalaxy67.atlassian.net/ (PROJECT_KEY=BK confirmed in `.agents/project.yaml`)
- [x] Staging environment reachable — URL confirmed in `.agents/project.yaml`
- [ ] CI/CD visibility — no GitHub Actions workflows exist; CI/CD is not configured

## Discovery Gaps

- [ ] GitHub repo URL unconfirmed — inferred from `app/qa/qa-config.ts` backendRepo field (`https://github.com/upex-galaxy/upex-bunkai-tms`); verify with team
- [ ] Production Supabase project ref — not available in code; required for `DBHUB_USER` suffix (`qa_inspector_ro.<project-ref>`)
- [ ] Staging Supabase project ref — same gap
- [ ] CI/CD: no `.github/workflows/` found — no automated builds, tests, or deploys configured in the repo
- [ ] Monitoring/alerting — no Sentry, Datadog, or equivalent found in `package.json` or code
- [ ] Production URL confirmed as `upexbunkai.vercel.app` via `.agents/project.yaml` but no explicit env entry for production in `project.yaml` — only `local` and `staging` environments defined
