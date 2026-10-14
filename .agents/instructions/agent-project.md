---
id: project
title: 'Project-specific instructions'
load_when: 'anything specific to this project: its own conventions, guardrails, environments or vocabulary not covered by another section'
triggers: []
paths: []
---

# Project-specific instructions

> Project-owned overlay. The boilerplate delivers this file once and never overwrites it; every other file in this folder is synced from upstream. Write this project's own rules here, one heading per topic, instead of editing `AGENTS.md` or a synced section. Knowledge about the system under test belongs in a project context skill (`<aspect>-context`), not here.

Add `triggers:` regex sources to the frontmatter above when a rule here should be routed by keyword (the hook reads them), and keep every `NEVER` / `MUST` line reachable: cite `Rule #N`, binding: `/<skill>`, or enforced: `bun run <script>` (checked by `bun run instructions:check`).

## Project context skills

One row per skill this project authored: the `<aspect>-context` skills `project-context` mode `context-skill` creates, and any other skill the project added. The skill router in `agent-skills-and-mcps.md` is synced, so `bun sync` overwrites a row written there; this file is never overwritten. Add each skill's trigger phrases to `triggers:` above as regex sources too, so the hook routes this file when a prompt names them. `bun run instructions:check` fails a row whose `.agents/skills/<slug>/SKILL.md` does not exist.

| Skill | Trigger | Purpose |
|---|---|---|

## Project Assessment (Phase 1)

Assessment Date: 2026-05-31

### Testing Maturity: 0/4
- Current state: None
- Test files: 0 (confirmed — `find <repo> -name "*.test.*" -o -name "*.spec.*" | wc -l` → 0)
- Frameworks: None configured (no Jest, Vitest, Playwright in devDependencies)
- Coverage: Unknown — no test runner configured

### Documentation State: Good
- README: yes — comprehensive setup + prerequisites guide (`README.md`)
- API docs: yes — Scalar UI at `/api/docs`, OpenAPI spec at `/api/openapi` (auto-generated via `@asteasolutions/zod-to-openapi`)
- Architecture: yes — `CONTEXT.md` (Context Engineering map) + `DESIGN.md` (design system spec) + migration comments in `supabase/migrations/`
- Setup guide: yes — `README.md` covers setup, `.env.example` covers all required env vars

### Code Quality
- [x] ESLint: configured — `eslint.config.js` present, `@antfu/eslint-config` + `@next/eslint-plugin-next`
- [x] Prettier: configured — `.prettierignore` referenced in `package.json` scripts
- [x] TypeScript: strict — `tsconfig.json` has `"strict": true`; the app repo's `typecheck` script is present
- [x] Pre-commit hooks: configured — Husky ^9.1.7 + lint-staged ^16.2.7 (ESLint fix on `.ts/.tsx`, Prettier on config/markup files)

### CI/CD Maturity: None
- No `.github/workflows/` directory found in the target repo
- No automated build, lint, test, or deploy pipeline

### Identified Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| No tests at all (0 test files) | HIGH | QA engineering goal — Phase 4 of discovery → `/test-automation` |
| No CI/CD pipeline | MEDIUM | Add GitHub Actions workflow; blocking for automated regression |
| No test runner in devDependencies | HIGH | Must add Playwright + test dependencies before `/test-automation` can run |
| Auth is magic-link (passwordless) — headless testing requires PAT bootstrap | MEDIUM | Headless path documented in `app/qa/qa-config.ts`; `POST /api/v1/auth/signup` provisions a password-based QA bot |
| Secret tables split pattern (0011/0012 migrations) — QA roles cannot read `access_token_secrets`, `magic_link_token_secrets`, `workspace_invite_secrets` | LOW | By design; QA accesses only public-facing columns; documented in `app/qa/qa-config.ts` db.revokedColumns |

### Phase Prioritization

- Phase 1: Normal — Constitution complete; all 4 outputs generated
- Phase 2: Normal — PRD/SRS can proceed; DESIGN.md and CONTEXT.md provide strong architectural context
- Phase 3: Normal — Infrastructure documented; DBHub MCP configured but needs `DBHUB_*` env vars
- Phase 4: Extended — No tests exist; KATA framework setup + Playwright installation required before any automation

### Blockers
- [ ] HIGH: Zero test files — must install Playwright + configure test runner before Phase 4 (run `/adapt-framework` after Phase 4 discovery)
- [ ] MEDIUM: No CI/CD — GitHub Actions workflow needed for automated regression (`/regression-testing` will have no CI target)
- [ ] INFO: `DBHUB_*` env vars must be populated from BK-29 before DBHub MCP can connect
