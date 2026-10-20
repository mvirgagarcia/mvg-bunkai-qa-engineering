# Measured Gotchas

> Loaded by: `business-e2e-context`, when reading this project's e2e map could mislead a competent session. Every row was measured on the date given against the source it names. Rows that stop being true move to §"No longer true"; they are never deleted. Proposed and applied per `agentic-qa-core/references/skill-refinement-protocol.md`.

## 1 · Reading the map

| # | Gotcha | Symptom | Fix | Measured | Verified against |
|---|---|---|---|---|---|
| 1 | The inactivity sweep is not scoped to a workspace | Calling `bunkai_sweep_abandoned_runs` from a test aborts idle Runs of every tenant on the shared database | Never call it with a low threshold; to test the sweep, use a high threshold and a Run you control, and expect other tenants' Runs to be swept too | 2026-10-19 | `app/qa/qa-config.ts` (`rpcAccess`) and `0075_run_inactivity_sweep.sql` on `origin/staging` |
| 2 | "Report bug" is available after a Run has ended | Seeing the control on a finished or aborted Run looks like a missed state guard | It is intended: a failure that happened stays reportable; only marking is gated on `running` | 2026-10-19 | `components/runs/RunnerView.tsx` (`canReportBug` comment) on `origin/staging` |
| 3 | Visible "coming soon" navigation entries are intentional | Workspace-level ATC Library, Test Runs, Bug Reports, Metrics and Settings → Members / Environments are disabled entries | Do not report them as broken links; the working pages live under the project sub-navigation and the workspace members page | 2026-10-19 | `components/layout/AppSidebar.tsx`, `lib/settings/nav-items.ts` on `origin/staging` |

## 2 · No longer true

_(empty)_
