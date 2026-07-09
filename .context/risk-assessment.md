# Risk Assessment — Phase 1

> Project: Bunkai (upex-bunkai-tms)
> Assessment Date: 2026-05-31
> Phase: Constitution (Phase 1)
> Status: HIGH risks present — review before proceeding to Phase 2

---

## HIGH Risks

### RISK-001: Zero Test Files

| Field | Detail |
|-------|--------|
| **Severity** | HIGH |
| **Description** | The target repo (`upex-bunkai-tms`) has zero test files. `find <repo> -name "*.test.*" -o -name "*.spec.*" | wc -l` returns 0. No test runner (Jest, Vitest, Playwright) is present in `devDependencies`. |
| **Impact** | Phase 4 (`/test-automation`) cannot run without first installing and configuring a test runner. The QA automation goal of this project — writing KATA-based tests for Bunkai — depends entirely on installing Playwright and wiring the KATA framework against the target stack. |
| **Detection** | `find /Users/micaela/Desktop/projects/upex/upex-bunkai-tms -name "*.test.*" -o -name "*.spec.*" | wc -l` → 0 |
| **Recommendation** | Run `/adapt-framework` after Phase 4 (Specification) to wire Playwright + KATA fixtures against Bunkai's API (magic-link auth, PAT bootstrap). Do NOT skip this step — Phase 4 test writing requires the framework to be configured first. |
| **Owner** | QA Lead / Framework Engineer |
| **Blocker for Phase** | Phase 4 only — Phases 2 and 3 can proceed normally |

---

### RISK-002: No Test Runner in devDependencies

| Field | Detail |
|-------|--------|
| **Severity** | HIGH |
| **Description** | `package.json` devDependencies contains no test runner (`jest`, `vitest`, `@playwright/test`, `playwright`, etc.). The `scripts` object has no `test:*` commands. |
| **Impact** | The QA engineering boilerplate (`bunkai-qa-engineering`) is the test runner environment — it must be adapted to the Bunkai stack before tests can execute. Running `bun run test` in the target repo would fail. |
| **Detection** | `package.json` devDependencies reviewed — no test runner found |
| **Recommendation** | The `bunkai-qa-engineering` repo (this QA framework) already has Playwright configured. After Phase 4, run `/adapt-framework` to configure it against Bunkai's environment (staging URL, PAT auth, DBHub MCP). The target repo itself does not need a test runner added. |
| **Owner** | QA Lead |
| **Blocker for Phase** | Phase 4 only — does not block Phases 2 or 3 |

---

## MEDIUM Risks

### RISK-003: No CI/CD Pipeline

| Field | Detail |
|-------|--------|
| **Severity** | MEDIUM |
| **Description** | No `.github/workflows/` directory found in the target repo. No automated build, lint, type-check, or test pipeline configured. |
| **Impact** | Regression testing (`/regression-testing` skill, Stage 6) will have no CI target to integrate with. Every deployment is manual. No automated quality gate before merging PRs. |
| **Detection** | `ls /Users/micaela/Desktop/projects/upex/upex-bunkai-tms/.github/workflows/` → "No workflows found" |
| **Recommendation** | Add a GitHub Actions workflow for: (1) `bun run repo:check` (lint + types + format), (2) Playwright E2E on staging after tests are written. This is a Phase 3 (Infrastructure) deliverable. |
| **Owner** | DevOps / QA Lead |
| **Blocker for Phase** | Does not block any discovery phase; blocks regression automation |

---

### RISK-004: Magic-Link Auth Requires PAT Bootstrap for Headless Testing

| Field | Detail |
|-------|--------|
| **Severity** | MEDIUM |
| **Description** | Bunkai's primary auth flow is passwordless (Supabase magic-link OTP). Browser tests cannot intercept OTP tokens. Headless API tests require provisioning a QA bot user with a password via `POST /api/v1/auth/signup` before any PAT can be minted. |
| **Impact** | CI test runs will fail if the QA bot user is not pre-provisioned in the staging environment. The hybrid cookie→PAT bridge requires a browser session for magic-link users. |
| **Detection** | `app/qa/qa-config.ts` — explicit documentation of the passwordless constraint and bootstrap path |
| **Recommendation** | (1) Provision `qa.bot@bunkai-test.dev` once in staging via `POST /api/v1/auth/signup`; store the PAT in the credentials Epic (BK-29). (2) In CI, use `POST /api/v1/auth/signin` to mint a fresh PAT per run. (3) Wire PAT as `API_TOKEN` env var in the `bunkai-qa-engineering` `.env`. |
| **Owner** | QA Lead |
| **Blocker for Phase** | Does not block discovery; blocks Phase 4 test execution in staging |

---

## LOW Risks

### RISK-005: QA Roles Cannot Read Secret Tables

| Field | Detail |
|-------|--------|
| **Severity** | LOW |
| **Description** | Migrations 0011/0012 moved secret hashes to sibling tables (`access_token_secrets`, `magic_link_token_secrets`, `workspace_invite_secrets`) and explicitly revoked access from `qa_inspector_ro` and `qa_inspector_rw` roles. |
| **Impact** | Tests that need to verify token hashes directly via DB cannot use QA roles. This is by design (security), not a bug. DB-level token validation tests must use service_role assertions via Supabase Studio, not DBHub MCP. |
| **Detection** | `supabase/migrations/0011_split_token_secrets.sql` — explicit REVOKE statements; `app/qa/qa-config.ts` db.revokedColumns |
| **Recommendation** | Design token tests around the API surface (verify token works, not the hash). Document in test notes that direct hash verification requires service_role access. |
| **Owner** | QA Engineer |
| **Blocker for Phase** | None |

---

## Summary

| Risk | Severity | Phase Impact | Action |
|------|----------|-------------|--------|
| RISK-001: Zero test files | HIGH | Phase 4 | Run `/adapt-framework` after Phase 4 |
| RISK-002: No test runner in deps | HIGH | Phase 4 | Use `bunkai-qa-engineering` as test runner |
| RISK-003: No CI/CD | MEDIUM | Post-Phase 3 | Add GitHub Actions in Phase 3 |
| RISK-004: Passwordless auth headless complexity | MEDIUM | Phase 4 | Pre-provision QA bot in staging |
| RISK-005: QA role secret table restriction | LOW | Phase 4 | Design API-surface tests, not hash-level |

**Phase gate decision:** HIGH risks do not block Phases 2 or 3. They are known constraints that gate Phase 4 (test automation). Proceed to Phase 2 with awareness that `/adapt-framework` is mandatory before test execution.
