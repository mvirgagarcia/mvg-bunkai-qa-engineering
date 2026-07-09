# Backend Infrastructure

> Product: Bunkai TMS
> Phase: 3 — Backend Discovery
> Generated: 2026-05-31
> Source of truth: `package.json`, `lib/env.ts`, `lib/api/`, `lib/supabase/`, `app/api/v1/*/route.ts`, `middleware.ts`

---

## 1. Runtime Environment

| Property | Value | Source |
|----------|-------|--------|
| Runtime | Bun | `package.json` (scripts use `bun` directly) |
| Bun minimum version | `>=1.0.0` | `package.json` `engines` field absent; `@types/bun ^1.3.5` implies runtime >=1.0.0 |
| Language | TypeScript | `typescript ^5.9.3` in devDependencies |
| TypeScript mode | Strict (`"strict": true`) | `tsconfig.json:20` |
| Package manager | Bun | `bun.lock` present at repo root; no `package-lock.json` or `yarn.lock` |
| Framework | Next.js ^15 (App Router) | `package.json` dependencies |
| Node types | `@types/node ^25.0.3` + `bun-types` | `tsconfig.json` types array |
| Target | ES2022 | `tsconfig.json:5` |
| Module resolution | Bundler | `tsconfig.json:14` |

---

## 2. Package Scripts

| Script | Command | Purpose |
|--------|---------|---------|
| `dev` | `next dev` | Start Next.js development server (Webpack, port 3000) |
| `build` | `next build` | Production build |
| `start` | `next start` | Run production build locally |
| `typecheck` | `tsc --noEmit` | TypeScript type check (alias for `types:check`) |
| `types:check` | `tsc --noEmit` | TypeScript type check |
| `types:gen` | `bun scripts/gen-supabase-types.ts` | Regenerate `lib/types/supabase.ts` from Supabase schema |
| `setup` | `bun cli/doctor.ts --preflight && bun cli/install.ts` | Full first-time setup: preflight checks + interactive installer |
| `setup:doctor` | `bun cli/doctor.ts` | Run doctor checks only (env var audit) |
| `agents:setup` | `bun scripts/agents-setup.ts` | Initialize `.agents/` directory |
| `up` | `bun cli/update-boilerplate.ts` | Update boilerplate scripts from upstream |
| `onboarding` | `bun scripts/onboarding.ts` | Interactive onboarding walkthrough |
| `api:sync` | `bun scripts/sync-openapi.ts` | Sync OpenAPI spec to `api/schemas/` (QA repo) |
| `openapi:gen` | `bun scripts/openapi-gen.ts` | Regenerate `public/openapi.json` from registry |
| `openapi:diff` | `bun scripts/openapi-diff.ts` | Diff current vs generated OpenAPI spec |
| `vars:check` | `bun scripts/lint-vars.ts` | Lint environment variable usage |
| `vars:env:check` | `bun scripts/check-vars.ts` | Verify all required env vars are set |
| `skills:check` | `bun scripts/lint-skills.ts` | Lint skill files |
| `skills:registry` | `bun scripts/build-skill-registry.ts` | Build skills registry |
| `skills:registry:check` | `bun scripts/build-skill-registry.ts --check` | Validate skills registry |
| `jira:sync-fields` | `bun scripts/sync-jira-fields.ts` | Sync Jira custom field definitions |
| `jira:sync-workflows` | `bun scripts/sync-jira-workflows.ts` | Sync Jira workflow definitions |
| `jira:sync-issues` | `bun scripts/sync-jira-issues.ts` | Sync Jira issues to `.context/PBI/` |
| `jira:sync-link-types` | `bun scripts/sync-jira-link-types.ts` | Sync Jira link type definitions |
| `jira:check` | `bun scripts/check-jira-setup.ts` | Verify Jira integration setup |
| `format:fix` | `prettier --write '**/*.{json,yml,yaml,css,scss,html}'` | Auto-format non-TS files |
| `format:check` | `prettier --check '**/*.{json,yml,yaml,css,scss,html}'` | Lint non-TS file formatting |
| `lint:check` | `eslint .` | Run ESLint on all files |
| `lint:fix` | `eslint --fix .` | Auto-fix lint issues |
| `repo:check` | `format:check && lint:check && types:check && vars:check && skills:check && skills:registry:check` | Full repo quality gate (CI-equivalent) |
| `repo:fix` | `format:fix && lint:fix && types:check && vars:check && skills:check && skills:registry:check` | Auto-fix everything fixable |
| `clean` | `rm -rf node_modules dist .next` | Delete all build artifacts |
| `prepare` | `husky` | Install Husky git hooks |
| `claude` | `dotenv -e .env -- claude` | Launch Claude Code with .env loaded |
| `opencode` | `dotenv -e .env -- opencode` | Launch OpenCode with .env loaded |

---

## 3. Core Dependencies

### Framework

| Package | Version | Purpose |
|---------|---------|---------|
| `next` | `^15` | Full-stack framework (App Router, RSC, API routes) |
| `react` | `^19` | UI rendering engine |
| `react-dom` | `^19` | React DOM renderer |

### Auth & Database

| Package | Version | Purpose |
|---------|---------|---------|
| `@supabase/supabase-js` | `^2.106.0` | Supabase JS client (DB queries, Auth admin API) |
| `@supabase/ssr` | `^0.10.3` | Supabase SSR helpers for Next.js (cookie-based sessions) |

### Validation

| Package | Version | Purpose |
|---------|---------|---------|
| `zod` | `^4.4.3` | Schema validation for request bodies and env vars |
| `@asteasolutions/zod-to-openapi` | `^8.5.0` | Generate OpenAPI spec from Zod schemas |

### API Documentation

| Package | Version | Purpose |
|---------|---------|---------|
| `@scalar/api-reference-react` | `^0.9.38` | Scalar API reference UI at `/api/docs` |

### UI Components

| Package | Version | Purpose |
|---------|---------|---------|
| `@radix-ui/react-dialog` | `^1.1.15` | Accessible dialog primitives |
| `@radix-ui/react-dropdown-menu` | `^2.1.16` | Accessible dropdown menu |
| `@radix-ui/react-tabs` | `^1.1.13` | Accessible tabs |
| `@radix-ui/react-tooltip` | `^1.2.8` | Accessible tooltip |
| `@tanstack/react-table` | `^8.21.3` | Headless data table (ATC list) |
| `@monaco-editor/react` | `^4.7.0` | Monaco editor (ATC steps + assertions) |
| `cmdk` | `^1.1.1` | Command palette |
| `sonner` | `^2.0.7` | Toast notifications |
| `lucide-react` | `^1.16.0` | Icon library |
| `class-variance-authority` | `^0.7.1` | CVA utility for variant-based styling |
| `clsx` | `^2.1.1` | Conditional className utility |
| `tailwind-merge` | `^3.6.0` | Tailwind class deduplication |

### CLI / Scripting Utilities

| Package | Version | Purpose |
|---------|---------|---------|
| `@clack/prompts` | `^1.4.0` | Interactive CLI prompts (installer) |
| `@inquirer/prompts` | `^8.1.0` | Alternative CLI prompts |
| `boxen` | `^8.0.1` | Box output for CLI |
| `cli-table3` | `^0.6.5` | Table output for CLI |
| `figures` | `^6.1.0` | Terminal symbols |
| `picocolors` | `^1.1.1` | Terminal color output |
| `yaml` | `^2.8.2` | YAML parsing (`.agents/project.yaml`, ATC assertions) |

### Dev Tooling

| Package | Version | Purpose |
|---------|---------|---------|
| `typescript` | `^5.9.3` | TypeScript compiler |
| `eslint` | `^9.28.0` | Linter |
| `@antfu/eslint-config` | `^4.16.0` | ESLint config |
| `@next/eslint-plugin-next` | `^16.2.6` | Next.js-specific lint rules |
| `prettier` | `^3.7.4` | Code formatter |
| `husky` | `^9.1.7` | Git hooks |
| `lint-staged` | `^16.2.7` | Run linters on staged files |
| `dotenv-cli` | `^8.0.0` | Load .env for `bun run claude` / `bun run opencode` |
| `autoprefixer` | `^10.5.0` | PostCSS autoprefixer |
| `postcss` | `^8.5.15` | CSS transformer |
| `tailwindcss` | `^3.4` | CSS framework |
| `@types/bun` | `^1.3.5` | TypeScript types for Bun runtime |
| `@types/node` | `^25.0.3` | TypeScript types for Node.js APIs |
| `@types/react` | `^19.0.0` | TypeScript types for React |
| `@types/react-dom` | `^19.0.0` | TypeScript types for React DOM |

> **Note**: No test runner is present in `devDependencies`. No Jest, Vitest, Playwright, or Cypress installed in the target repo. All E2E automation lives in the QA engineering repo (`bunkai-qa-engineering`).

---

## 4. Environment Variables

### Key Naming Note

The `.env.example` uses **new-style Supabase keys** (`SUPABASE_PUBLISHABLE_KEY` / `SUPABASE_SECRET_KEY`), while `lib/env.ts` (runtime app code) still validates **old-style names** (`NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY`). The `.mcp.json` bridges them via `${SUPABASE_PUBLISHABLE_KEY}` → `SUPABASE_ANON_KEY`. This naming split is a **Discovery Gap** — see §10 below.

For `.env` setup, use the names that `lib/env.ts` actually validates at runtime. The CLI doctor will flag legacy key presence.

Sources: `lib/env.ts` (runtime validation), `middleware.ts` (direct access), `lib/urls.ts` (Vercel system vars), `.env.example`, `cli/lib/variables-manifest.ts`

### Required (app won't start without these)

| Variable | Example Format | Where Used | Source |
|----------|---------------|------------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<project-ref>.supabase.co` | `lib/env.ts`, `middleware.ts`, `lib/supabase/client.ts` | Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` (JWT) | `lib/env.ts`, `middleware.ts`, `lib/supabase/client.ts` | Supabase Dashboard → Settings → API (anon/publishable key) |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` (JWT, service role) | `lib/env.ts`, `lib/supabase/admin.ts` | Supabase Dashboard → Settings → API (secret/service_role key) |

> **CRITICAL**: `SUPABASE_SERVICE_ROLE_KEY` is server-only. The module imports `server-only` from `lib/env.ts` — it MUST NEVER appear in client bundles. Validated via Zod on server startup.

### Optional (has defaults)

| Variable | Default | Purpose | Source |
|----------|---------|---------|--------|
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | Base URL for auth redirects, invite links, OAuth callbacks | `lib/env.ts:31`, `.env.example` |
| `SUPABASE_JWT_SECRET` | (none — optional) | Sign/verify custom JWTs; required before any feature using custom JWT claims | `lib/env.ts:27` |

### External Service / MCP Infrastructure

These are not read by the Next.js app itself — used by CLI, MCPs, and QA tooling.

| Variable | Example Format | Purpose | Source |
|----------|---------------|---------|--------|
| `ATLASSIAN_URL` | `https://<org>.atlassian.net` | Jira/Xray API base URL | `.env.example` |
| `ATLASSIAN_EMAIL` | `user@example.com` | Jira authentication email | `.env.example` |
| `ATLASSIAN_API_TOKEN` | (token string) | Jira API token | `.env.example` |
| `TAVILY_API_KEY` | (api key string) | Tavily web search MCP | `.env.example` |
| `RESEND_API_KEY` | `re_...` | Resend email MCP | `.env.example` |
| `SUPABASE_ACCESS_TOKEN` | (PAT) | Supabase MCP server control plane | `.env.example` |
| `SUPABASE_PUBLISHABLE_KEY` | `eyJ...` | New-style anon key — `.mcp.json` maps to `SUPABASE_ANON_KEY` | `.env.example`, `.mcp.json:21` |
| `SUPABASE_SECRET_KEY` | `eyJ...` | New-style secret key — `.mcp.json` maps to `SUPABASE_SERVICE_ROLE_KEY` | `.env.example`, `.mcp.json:22` |
| `POSTGRES_HOST` | `db.<project-ref>.supabase.co` | Direct Postgres host (DBHub MCP, raw SQL) | `.env.example` |
| `POSTGRES_USER` | `postgres` | Postgres username | `.env.example` |
| `POSTGRES_PASSWORD` | (password) | Postgres password | `.env.example` |
| `POSTGRES_DATABASE` | `postgres` | Postgres database name | `.env.example` |
| `POSTGRES_URL` | `postgres://...` (port 6543) | Pooled connection URL (PgBouncer) | `.env.example` |
| `POSTGRES_URL_NON_POOLING` | `postgres://...` (port 5432) | Direct connection URL | `.env.example` |
| `DBHUB_TYPE` | `postgres` | DBHub MCP source type | `dbhub.toml` |
| `DBHUB_HOST` | `db.<project-ref>.supabase.co` | DBHub MCP host | `dbhub.toml` |
| `DBHUB_PORT` | `5432` | DBHub MCP port (session pooler) | `dbhub.toml` |
| `DBHUB_DATABASE` | `postgres` | DBHub MCP database | `dbhub.toml` |
| `DBHUB_USER` | `qa_inspector_ro.<project-ref>` | DBHub MCP user (QA read-only role) | `dbhub.toml` |
| `DBHUB_PASSWORD` | (password) | DBHub MCP password | `dbhub.toml` |
| `N8N_API_URL` | `https://<instance>/api/v1` | n8n workflow automation MCP | `.env.example` |
| `N8N_API_KEY` | (api key) | n8n API key | `.env.example` |

### Runtime-Injected (Vercel system env — not set manually)

| Variable | Values | Purpose | Source |
|----------|--------|---------|--------|
| `VERCEL_ENV` | `production` / `preview` / (absent = local) | Environment detection for URL routing | `lib/urls.ts:18–22` |
| `NODE_ENV` | `production` / `development` | Standard Node.js environment flag | `lib/supabase/` indirect usage |

---

## 5. Database Configuration

| Property | Value | Source |
|----------|-------|--------|
| Type | PostgreSQL 17 | `supabase/migrations/` schema |
| Provider | Supabase managed cloud | `lib/env.ts` SUPABASE_URL |
| ORM | None — direct Supabase JS SDK | `package.json` (no Prisma/Drizzle/TypeORM) |
| Client library | `@supabase/supabase-js ^2.106.0` | `package.json` |
| SSR cookie helper | `@supabase/ssr ^0.10.3` | `package.json` |
| Migration tool | Supabase CLI (`supabase db`) | `supabase/migrations/` directory |
| Seed file | None detected | `supabase/` has only `migrations/` |
| RLS | Enabled on all tables | `supabase/migrations/0001–0012` |
| Connection pool | Supabase PgBouncer (port 6543) for pooled; port 5432 for session | `dbhub.toml`, `.env.example` |

### DB Clients (three modes)

| Client | File | Keys Used | Session |
|--------|------|-----------|---------|
| Browser client | `lib/supabase/client.ts` | `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser cookie, per-tab singleton |
| Server client (SSR) | `lib/supabase/server.ts` | `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Cookie store (SSR cookies via `@supabase/ssr`) |
| Admin client | `lib/supabase/admin.ts` | `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` | No session, no auto-refresh — server-only, bypasses RLS |

### Migrations Listing

| Migration | File | Description |
|-----------|------|-------------|
| 0001 | `0001_tenancy.sql` | Workspaces, workspace_members, RLS tenancy |
| 0002 | `0002_projects_modules.sql` | Projects, modules |
| 0003 | `0003_authoring.sql` | User stories, acceptance criteria |
| 0004 | `0004_atcs.sql` | ATCs, steps, assertions, GIN full-text index |
| 0005 | `0005_rls_helpers.sql` | RLS helper functions (`bunkai_is_workspace_member` etc.) |
| 0006 | `0006_bootstrap_workspace.sql` | `bunkai_bootstrap_workspace` RPC |
| 0007 | `0007_save_atc.sql` | `bunkai_save_atc` RPC |
| 0008 | `0008_access_tokens.sql` | PAT access tokens table |
| 0009 | `0009_cross_cutting.sql` | Idempotency keys, activity log, feature flags |
| 0010 | `0010_workspace_invites.sql` | Workspace invites |
| 0011 | `0011_split_token_secrets.sql` | Separate secret hashes (PAT, invite, magic-link tokens) |
| 0012 | `0012_drop_legacy_token_hashes.sql` | Remove legacy hash columns after split |

---

## 6. Migration Commands

```bash
# Apply all pending migrations to local Supabase
supabase db push --local

# Apply to remote (staging/prod)
supabase db push --project-ref <project-ref>

# Create a new migration file
supabase migration new <migration-name>

# Reset local database and reapply all migrations
supabase db reset

# Start local Supabase stack (requires Docker)
supabase start

# Stop local Supabase stack
supabase stop

# Check migration status
supabase migration list

# Regenerate TypeScript types from schema
bun run types:gen
```

> No seed file found in `supabase/`. The `supabase db reset` command runs only migrations. For QA test data provisioning, use `POST /api/v1/auth/signup` to create users and the REST API to create workspaces.

---

## 7. Build Configuration

| Property | Value | Source |
|----------|-------|--------|
| Build command | `next build` | `package.json` scripts.build |
| Output mode | Default (serverless functions on Vercel) | `next.config.ts` — no `output: 'standalone'` or `output: 'export'` |
| `outputFileTracingRoot` | Repo root (via `path.resolve(import.meta.dirname)`) | `next.config.ts:6` |
| `reactStrictMode` | `true` | `next.config.ts:5` |
| `typedRoutes` | `true` (experimental typed Next.js routes) | `next.config.ts:7` |
| `images.remotePatterns` | Empty array (no remote image sources configured) | `next.config.ts:8–10` |
| Security headers | Not configured (`headers()` absent from `next.config.ts`) | `next.config.ts` — **Discovery Gap** |
| Turbopack | Not enabled (no `--turbo` flag in `dev` script) | `package.json` scripts.dev |
| TSConfig paths | `@/*`, `@app/*`, `@components/*`, `@lib/*` | `tsconfig.json:12–16` |
| Incremental TS | `true` | `tsconfig.json:4` |

---

## 8. Auth Flow Contract

> This section is REQUIRED for `/adapt-framework`. Every request shape below is sourced from the route handler code.

### Flow 1 — Magic-Link (primary browser flow)

**Step 1: Request OTP**

```
POST /api/v1/auth/magic-link
Content-Type: application/json

{
  "email": "user@example.com",       // required, valid email, max 254 chars
  "next": "/projects"                // optional, root-relative path, default "/projects"
}

Response 200:
{ "ok": true }

Error 429:
{ "error": { "code": "rate_limited", "message": "..." } }

Error 502:
{ "error": { "code": "upstream_error", "message": "..." } }
```

**Step 2: OTP Exchange (user clicks email link)**

```
GET /auth/callback?code=<otp-code>&next=/projects
→ 307 redirect to /projects  (on success)
→ 307 redirect to /login?error=otp_exchange_failed&reason=...  (on error)
→ 307 redirect to /login?error=missing_code  (if code absent)
```

Source: `app/api/v1/auth/magic-link/route.ts`, `app/auth/callback/route.ts`

---

### Flow 2 — Email/Password (headless QA / CLI flow)

**Step 1: Signup (provision QA user)**

```
POST /api/v1/auth/signup
Content-Type: application/json

{
  "email": "qa.bot@example.com",          // required, max 254 chars
  "password": "secret123",               // required, min 6, max 128 chars
  "pat_name": "cli-signup",              // optional, max 80 chars
  "pat_scopes": ["atc:read","atc:write","run:execute","workspace:admin"],  // optional
  "pat_expires_in_days": 90              // optional, 1–365
}

Response 201:
{
  "user": { "id": "<uuid>", "email": "qa.bot@example.com" },
  "session": {
    "access_token": "<supabase-jwt>",
    "refresh_token": "<token>",
    "expires_at": 1234567890,
    "token_type": "bearer"
  },
  "pat": {
    "token": "bk_pat_<12-char-prefix>.<base64url-secret>",
    "id": "<uuid>",
    "name": "cli-signup",
    "scopes": ["atc:read","atc:write","run:execute","workspace:admin"],
    "expires_at": null
  },
  "warning": "Store the PAT token now — it cannot be retrieved later."
}

Error 409: { "error": { "code": "conflict", "message": "A user with email ... already exists." } }
```

**Step 2: Signin (subsequent sessions)**

```
POST /api/v1/auth/signin
Content-Type: application/json

{
  "email": "qa.bot@example.com",
  "password": "secret123",
  "pat_name": "cli-signin",              // optional
  "pat_scopes": ["atc:read","atc:write","run:execute","workspace:admin"],
  "pat_expires_in_days": 90
}

Response 200: (same shape as signup 201 above)

Error 401: { "error": { "code": "unauthorized", "message": "Invalid email or password." } }
```

Source: `app/api/v1/auth/signup/route.ts`, `app/api/v1/auth/signin/route.ts`

---

### Flow 3 — PAT Bearer (API / CI / agent flow)

**Token format**: `bk_pat_<12-char-prefix>.<base64url-secret>` (prefix = first 12 chars of 32-byte base64url-encoded secret)

**Every protected API call**:

```
GET /api/v1/me
Authorization: Bearer bk_pat_<prefix>.<secret>

Response 200:
{
  "user": { "id": "<uuid>", "email": "qa.bot@example.com" },
  "workspaces": [...],
  "active_workspace_id": "<uuid>",
  "auth": { "source": "bearer", "scopes": ["atc:read","atc:write",...] }
}

Error 401: { "error": { "code": "unauthorized", "message": "Invalid token." } }
Error 403: { "error": { "code": "forbidden", "message": "Token missing required scope: <scope>" } }
```

**Available PAT scopes**:

| Scope | Purpose |
|-------|---------|
| `atc:read` | Read ATC data |
| `atc:write` | Create/update ATCs |
| `run:execute` | Execute test runs |
| `workspace:admin` | Workspace administrative operations |

**Verification algorithm** (server-side, `lib/api/middleware/bearer.ts`):
1. Strip `Bearer ` prefix → raw token must start with `bk_pat_`
2. Parse: `body = token.slice('bk_pat_'.length)`, split at first `.` → `prefix` (12 chars) + `remainder`
3. `fullSecret = prefix + remainder`
4. DB lookup: `SELECT ... FROM access_tokens WHERE token_prefix = prefix LIMIT 5`
5. Fetch secrets: `SELECT token_id, hash FROM access_token_secrets WHERE token_id IN (...)`
6. Compare: `sha256Hex(fullSecret) === stored_hash` AND `revoked_at IS NULL` AND (`expires_at IS NULL` OR `expires_at > now()`)
7. On match: update `last_used_at` fire-and-forget; return `BearerContext { userId, workspaceId, scopes, tokenId }`

Source: `lib/api/middleware/bearer.ts`, `lib/api/pat.ts`

---

### Dual-Mode Auth (API layer)

All `/api/v1/*` routes call `requireAuth(request)` which checks Bearer first, then falls back to cookie session:

```typescript
// lib/api/auth.ts
interface ApiAuthContext {
  userId: string
  source: 'cookie' | 'bearer'
  scopes: string[]       // empty for cookie sessions (RLS is the gate)
  tokenId: string | null
  workspaceId: string | null
}
```

Cookie sessions bypass PAT scope checks — RLS policies enforce data isolation. Bearer sessions bypass RLS (admin client) — scopes are the gate.

---

## 9. Health Check Endpoints

| Endpoint | Method | Auth | Response |
|----------|--------|------|---------|
| `GET /api/v1/health` | GET | None (public) | `{ ok: true, service: "bunkai-tms", env: "local"|"staging"|"production", ts: "<ISO date>" }` |

Source: `app/api/v1/health/route.ts`

> `force-dynamic` is set — this endpoint is never cached, always executes fresh. Suitable as a Vercel health check probe.

---

## 10. Local Development Setup

```bash
# 1. Prerequisites: Bun >=1.0.0, Docker (for local Supabase), Supabase CLI

# 2. Install dependencies
bun install

# 3. Set up environment
cp .env.example .env
# Edit .env and fill in:
#   NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
#   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
#   SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
#   NEXT_PUBLIC_APP_URL=http://localhost:3000
# Optional:
#   SUPABASE_JWT_SECRET=<jwt-secret>

# 4a. Start local Supabase stack (uses Docker)
supabase start

# 4b. Apply all migrations to local stack
supabase db push --local

# 5. Start development server
bun run dev

# 6. Verify
curl http://localhost:3000/api/v1/health
# Expected: {"ok":true,"service":"bunkai-tms","env":"local","ts":"..."}

# 7. Open API docs
# Browser: http://localhost:3000/api/docs
```

---

## 11. Discovery Gaps

| Gap | Impact | Suggested Source |
|-----|--------|-----------------|
| **Env var naming split**: `.env.example` uses `SUPABASE_PUBLISHABLE_KEY`/`SUPABASE_SECRET_KEY` (new-style), but `lib/env.ts` validates `NEXT_PUBLIC_SUPABASE_ANON_KEY`/`SUPABASE_SERVICE_ROLE_KEY` (old-style). `.mcp.json` bridges them. | QA devs who copy `.env.example` verbatim will get startup errors from `lib/env.ts`. Requires manual mapping. | `cli/lib/variables-manifest.ts` DEPRECATED_VARS confirms old names are deprecated but `lib/env.ts` still uses them. Team must align `lib/env.ts` to the new names. |
| **No `engines` field** in `package.json` | Cannot enforce minimum Bun version via npm/bun install | Add `"engines": { "bun": ">=1.0.0" }` to `package.json` |
| **No seed file** in `supabase/` | Cannot reset DB to a known baseline for isolated test runs | Create `supabase/seed.sql` with QA-safe fixture data |
| **No local Supabase config.toml** | `supabase start` requires `supabase/config.toml` — not found in repo | Run `supabase init` in target repo to generate it |
| **No test runner installed** | No unit/integration tests in target repo; zero test coverage | All tests live in `bunkai-qa-engineering` and run against the deployed app |
| **Security headers absent** | CSP, HSTS, X-Frame-Options not configured in `next.config.ts` | Add `headers()` function to `next.config.ts` |
| **Rate limiting is Supabase passthrough** | `/api/v1/auth/magic-link` unprotected at middleware level | Phase F comment in `magic-link/route.ts` mentions Upstash Redis |
| **`SUPABASE_JWT_SECRET` optional but needed for PAT JWT verification** | Any feature using custom JWT claims will break silently if absent | Add to Required tier once JWT-based auth features ship |
