# Measured Gotchas

> Loaded by: `business-data-context`, when reading this project's data map could mislead a competent session. Every row was measured on the date given against the source it names. Rows that stop being true move to §"No longer true"; they are never deleted. Proposed and applied per `agentic-qa-core/references/skill-refinement-protocol.md`.

## 1 · Reading the map

| # | Gotcha | Symptom | Fix | Measured | Verified against |
|---|---|---|---|---|---|
| 1 | `atcs.status` is a dead column | An ATC reads `unrun` (or a stale value) although it has passed and failed Runs | Read execution results from `run_atcs` (latest Run per ATC), never from `atcs.status` | 2026-10-19 | `supabase/migrations/0050_project_coverage_report_real_execution_source.sql` header on `origin/staging` |
| 2 | Business RPCs fail closed from the DB MCP | Calling a `bunkai_*` RPC through the QA role raises `42501`, `P0002` or returns empty, although the data exists | Those RPCs bind the actor to `auth.uid()`, which is NULL on a direct database session; exercise them through the API with a real session or PAT, and use the DB MCP to read rows | 2026-10-19 | `0085` / `0086` headers; live `qa_inspector_ro` session |
| 3 | The staging database runs ahead of staging's code | A table, column or trigger exists in the database but in no migration on `origin/staging` | Look for the migration on feature branches (`git grep <name> $(git for-each-ref --format='%(refname:short)' refs/remotes/origin) -- supabase/migrations`); the team applies migrations to the shared database before merging | 2026-10-19 | `run_step_attachments` live vs `0097` only on `feature/BK-593-run-step-evidence` |
| 4 | Cron jobs and the migration ledger are not readable | `permission denied for schema cron` / `supabase_migrations` | Read schedules from the migration source (`cron.schedule` calls) and record the live state as unverified | 2026-10-19 | DB MCP queries as `qa_inspector_ro` |
| 5 | `information_schema` undercounts tables | `information_schema.tables` shows 38 tables, `pg_class` 41 | The 3 `*_secrets` tables are revoked from the QA roles; count from `pg_class` when the total matters | 2026-10-19 | Both queries on the live database |

## 2 · No longer true

_(empty)_
