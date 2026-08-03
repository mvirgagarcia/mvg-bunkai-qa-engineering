# BK-148 — Test Documentation Coverage Matrix

**Story:** BK-148 — TMS-Project Environments (List, Add, Rename, Remove)
**Stage 4 (test-documentation) date:** 2026-07-10
**TMS modality:** jira-native (degraded acli-only; no Xray creds) — ATP/ATR on Story fields, Tests as native `Test` issues
**Analyzed:** 25 ATP scenarios → **Documented:** 10 (8 Candidate + 2 Manual) → **Deferred:** 15

## Persisted Tests

| Jira | TC | Verdict | Status | Type | Priority | Covers (ATP TC#) |
|---|---|---|---|---|---|---|
| BK-190 | TC#1 | Candidate | Candidate | API | critical | 1 |
| BK-191 | TC#2 | Candidate | Candidate | API | critical | 2, 3 |
| BK-192 | TC#3 | Candidate | Candidate | API | high | 5, 7, 8 |
| BK-193 | TC#4 | Candidate | Candidate | API | high | 9, 10, 11 |
| BK-194 | TC#5 | Candidate | Candidate | API | high | 12, 13 |
| BK-195 | TC#6 | Candidate | Candidate | API | high | 15, 16, 17, 18 |
| BK-196 | TC#7 | Candidate | Candidate | E2E | medium | 20, 21, 22 |
| BK-197 | TC#8 | Candidate | Candidate | E2E | medium | 24 |
| BK-198 | TC#9 | Manual | MANUAL | E2E | low | 23 (reframed) |
| BK-199 | TC#10 | Manual | MANUAL | UI | low | 19 |

All 10 linked to BK-148 via `Test` link type (Story *is tested by* Test).

## AC → Test coverage

| AC | Description | Tests |
|---|---|---|
| AC#1 | Member lists environments | BK-190, BK-196, BK-199 |
| AC#2 | Add/rename/remove with uniqueness+trim | BK-191, BK-192, BK-193, BK-194, BK-197, BK-198 |
| AC#3 | Delete guard on referenced env | BK-195 |
| AC#4 | Happy-path/validation/guard on staging | BK-196, BK-197 |
| AC#5 | No critical/major defects | (all — see ATR) |

## Deferred (NOT created in TMS)

| ATP TC# | Reason |
|---|---|
| TC#4 | Empty-list read — trivial, folded into BK-190 assertions |
| TC#6 | List-after-create — assertion inside the create flow (BK-192) |
| TC#14 | Idempotent same-name rename — low-value edge |
| TC#25 | In-use delete via UI — blocked on Runs fixture (FEAT-025); revisit when runs seedable |

## Source-code discrepancies folded into the Tests

1. Errors render **inline**, not toasts (BK-197, BK-198).
2. 422 message is generic; assert `code` not string (BK-193).
3. Empty-name 422 unreachable via UI — reframed as disabled-button check (BK-198).
4. **Cross-workspace write → 403, not 404** (existence disclosure). BK-191 asserts 403. → **Improvement pending** (user is validating before filing).
5. Delete guard counts **all** run statuses (BK-195).
6. DELETE success body double-nested (BK-195).

## Improvement filed

- **BK-200 (Mejora, Abierta)** — cross-workspace environment PATCH/DELETE discloses existence via 403 instead of non-disclosing 404. Linked Relates → BK-148 + BK-191. Root cause: `SECURITY DEFINER` RPCs + no `FORCE ROW LEVEL SECURITY` on `project_environments` → the resolution SELECT sees the foreign row, so the intended P0002/404 branch is skipped and the auth gate returns 42501/403. Validated against deployed code (`origin/staging` @ `c79c564`, local in sync). The code's own comment claims non-disclosure; the implementation does not achieve it.

## Known drift (unresolved — needs Jira admin)

- **Field drift**: `.agents/jira-fields.json` maps ATP/ATR to 10120/10284 but the live Story edit screen uses **10067/10147**. `bun run jira:sync-fields --force` was SKIPPED — the current Jira user lacks Administer permission. Workaround used: live `editmeta` read. A Jira admin must run the sync and commit `.agents/jira-*.json`.
- **Workflow language drift**: cached display names are English (`READY`, `In Review`); live Jira is localized (`Listo`, `En revisión`). Candidate/MANUAL are English live. Transition via REST (match `to.name`), not acli `--status` (silent no-op on mismatch).
