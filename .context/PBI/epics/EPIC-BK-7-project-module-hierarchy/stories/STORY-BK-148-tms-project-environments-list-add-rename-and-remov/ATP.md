# Acceptance Test Plan — BK-148: TMS-Project Environments CRUD

**Story**: BK-148 | TMS-Project Environments (List, Add, Rename, Remove)  
**Date**: 2026-06-27  
**TMS Modality**: jira-native (ATP on Story custom field)  
**Test Environment**: staging (https://staging-upexbunkai.vercel.app)  
**Overall Risk Score**: 125 CRITICAL  

---

## Story Explanation (Plain English)

Bunkai TMS users need a way to manage test run environments at the project level. The feature allows Senior QA Engineers to list, create, rename, and delete environments (e.g., "Production", "Staging", "Dev") so they can target manual test runs to the right infrastructure. Environments are project-scoped, isolated by multi-tenant RLS policies, and cannot be deleted if active test runs reference them. This is a foundational piece of the Run Execution pipeline (FEAT-025).

---

## Acceptance Criteria (Verbatim from Story)

1. **AC #1** — A project member can open the project's environment list and see every environment for that project.
2. **AC #2** — A project member can add, rename, and remove an environment, with the uniqueness and trimming rules enforced.
3. **AC #3** — Removing an environment that a Run already references is handled safely per the agreed business rule (default: blocked, with a clear message).
4. **AC #4** — The happy-path, validation, and guard scenarios in the Acceptance Criteria are demonstrably met on staging.
5. **AC #5** — Acceptance criteria validated; no critical or major defects open.

---

## Business Rules & Constraints

1. **Scope**: Environments are project-scoped. User A in workspace X cannot list, create, rename, or delete environments from workspace Y.
2. **Uniqueness**: Environment names must be unique within a project, case-insensitive, after trimming leading/trailing whitespace.
3. **Name validation**: 
   - Min 1 character (after trim), max 50 characters
   - Trimming happens server-side (client-side expectation: input shows trimmed, server enforces)
   - Empty string or only whitespace → 422 `validation_failed` error
4. **Trimming**: Whitespace is removed server-side. Input "  Staging  " persists as "Staging".
5. **Delete guard**: An environment cannot be deleted if ≥1 active test run references it. Status is checked at delete time (TOCTOU window exists but is backstopped by FK constraint in DB).
6. **Authorization**: Only workspace members (role ≥ member) can create/rename/delete. Viewer role cannot mutate.
7. **RLS isolation**: Per CRITICAL-001 (master-test-plan.md), environments are filtered by workspace + project membership. Non-members see 0 rows (not 403, silent zero).
8. **Design approach** (live-first): No dedicated mockup. Environments UI is embedded in project settings (reusing design tokens + list/form patterns from project shell).

---

## Test Scenarios (Risk-Ordered, Highest First)

### Scenario 1: RLS Multi-Tenancy Isolation
**Risk Score**: 125 CRITICAL (data breach if broken)  
**Why**: Multi-tenancy is the core value prop. Broken RLS = all data exposed across workspaces.

#### Test Cases (1:N Explode from AC #1 + RLS concern)

- **BK-148: TC#1** — Validate User A (WS-X) lists only environments in their project; User B (WS-Y) sees zero environments from WS-X  
  _Precond_: 2 workspaces, User A in WS-X with project P1 (3 envs), User B in WS-Y with project P2 (2 envs)  
  _Expected_: User A GET `/api/v1/projects/{P1-id}/environments` → 200, 3 envs (only P1 envs). User B same call for P1 → 404 or 0 rows (non-disclosing)

- **BK-148: TC#2** — Validate User A cannot rename/delete an environment in a different workspace even with direct env_id  
  _Precond_: Env E1 in WS-Y, User A in WS-X  
  _Expected_: PATCH `/api/v1/environments/{E1-id}` with User A's token → 404 `not_found` (non-disclosing; RLS silently filters)

- **BK-148: TC#3** — Validate workspace member (viewer role) cannot create/mutate environments despite being workspace member  
  _Precond_: Viewer role in WS-X, project P1  
  _Expected_: POST/PATCH/DELETE on environments → 403 `forbidden` ("must be member with write access")

---

### Scenario 2: Uniqueness & Conflict Detection  
**Risk Score**: 60 HIGH (data integrity; duplication confusion)  
**Why**: Uniqueness is enforced at 3 layers (DB index, server validation, UI). Bypass at any layer = silent duplication.

#### Test Cases (1:N Explode from AC #2)

- **BK-148: TC#4** — Validate environment list shows all environments ordered by name (empty project)  
  _Precond_: Empty project with 0 environments  
  _Expected_: GET → 200, `{"environments": []}`

- **BK-148: TC#5** — Validate create succeeds with valid unique name  
  _Precond_: Project P1 with 0 environments  
  _Expected_: POST `{"name": "Staging"}` → 201, returns env object with id/name/created_at

- **BK-148: TC#6** — Validate list includes new environment after create  
  _Precond_: After TC#5  
  _Expected_: GET → 200, list includes "Staging" env

- **BK-148: TC#7** — Validate create fails when name already exists (exact case)  
  _Precond_: Env "Staging" exists in project P1  
  _Expected_: POST `{"name": "Staging"}` → 409 `conflict` ("already exists")

- **BK-148: TC#8** — Validate create fails when name exists (case-insensitive)  
  _Precond_: Env "staging" exists  
  _Expected_: POST `{"name": "STAGING"}` → 409 `conflict` (case-insensitive match)

- **BK-148: TC#9** — Validate whitespace is trimmed on create  
  _Precond_: Project P1  
  _Expected_: POST `{"name": "  Dev  "}` → 201, persisted as "Dev" (trimmed); next GET shows "Dev"

- **BK-148: TC#10** — Validate empty name (after trim) is rejected  
  _Precond_: Project P1  
  _Expected_: POST `{"name": ""}` → 422 `validation_failed` ("between 1 and 50 characters")

- **BK-148: TC#11** — Validate name > 50 chars is rejected  
  _Precond_: Project P1  
  _Expected_: POST `{"name": "x" * 51}` → 422 `validation_failed`

- **BK-148: TC#12** — Validate rename succeeds with valid unique name  
  _Precond_: Env "Staging" exists  
  _Expected_: PATCH `/api/v1/environments/{id}` `{"name": "Prod"}` → 200, returns updated env

- **BK-148: TC#13** — Validate rename fails when target name already exists in project  
  _Precond_: Env1="Staging", Env2="Dev" in project P1  
  _Expected_: PATCH Env2 `{"name": "Staging"}` → 409 `conflict` ("already exists")

- **BK-148: TC#14** — Validate rename to same name succeeds (idempotent)  
  _Precond_: Env "Staging" exists  
  _Expected_: PATCH `{"name": "Staging"}` → 200, no change (idempotent)

---

### Scenario 3: Delete Guard — Environments with Active Runs
**Risk Score**: 50 HIGH (data consistency; orphaned run references)  
**Why**: A run's environment reference must remain valid. Prevent deletes only if guarded correctly.

#### Test Cases (1:N Explode from AC #3)

- **BK-148: TC#15** — Validate delete succeeds when no runs reference environment  
  _Precond_: Env "Test" with 0 run references  
  _Expected_: DELETE → 200, `{"deleted": true}`; next GET env list excludes it

- **BK-148: TC#16** — Validate delete fails when 1 run references environment  
  _Precond_: Env "Staging" with 1 active run reference  
  _Expected_: DELETE → 409 `conflict` ("in use by 1 run(s) and cannot be removed")

- **BK-148: TC#17** — Validate delete fails when multiple runs reference environment  
  _Precond_: Env "Prod" with 5 active runs  
  _Expected_: DELETE → 409 `conflict` ("in use by 5 run(s)...")

- **BK-148: TC#18** — Validate delete fails even if all runs are archived/completed (cardinality check)  
  _Precond_: Env "QA" with 3 completed runs (status=completed, but still referenced)  
  _Expected_: DELETE → 409 `conflict` (cardinality check on all statuses, not just active)

---

### Scenario 4: Happy-Path CRUD Workflow  
**Risk Score**: 20 LOW (basic feature; low blast if broken once guards pass)  
**Why**: Once RLS + uniqueness + delete guard are verified, happy path is mechanical.

#### Test Cases (1:N Explode from AC #1, #4)

- **BK-148: TC#19** — Validate UI environments section loads and displays list (no load timeout)  
  _Precond_: Project settings page open on staging  
  _Expected_: UI renders environments section within 2 seconds; shows list or empty state

- **BK-148: TC#20** — Validate create button opens form and submit fires POST request  
  _Precond_: Settings page, empty environments list  
  _Expected_: Click "Add Environment" → form appears; enter "Staging" → POST fires; env appears in list

- **BK-148: TC#21** — Validate rename: click edit, change name, save fires PATCH  
  _Precond_: Env "Staging" in list  
  _Expected_: Click env → inline edit → change to "Production" → save → PATCH fires; list updates

- **BK-148: TC#22** — Validate delete: click delete, confirmation modal, confirm fires DELETE  
  _Precond_: Env "Test" with no runs  
  _Expected_: Click delete → confirm → DELETE fires; env removed from list

- **BK-148: TC#23** — Validate validation error toast on create (empty name)  
  _Precond_: Create form open  
  _Expected_: Submit empty → 422 → toast shows error message (e.g., "Name must be between 1 and 50 characters")

- **BK-148: TC#24** — Validate conflict error toast on create (duplicate name)  
  _Precond_: "Staging" exists; create form open  
  _Expected_: Submit "Staging" → 409 → toast shows "already exists"

- **BK-148: TC#25** — Validate in-use error toast on delete (with run count)  
  _Precond_: Env "Prod" with 2 active runs  
  _Expected_: Click delete → toast shows "in use by 2 run(s)" (or similar)

---

## Test Data Requirements

### Setup
- **Workspaces**: 2 (WS-X for User A, WS-Y for User B)
- **Users**: 
  - User A: workspace member (role=member), in WS-X
  - User B: workspace member (role=member), in WS-Y
  - User C: workspace member (role=viewer), in WS-X (for role-based access tests)
- **Projects**:
  - P1: in WS-X, owned by User A, with 0 initial environments
  - P2: in WS-Y, owned by User B, with 2 pre-loaded environments
- **Environments** (preload for isolation tests):
  - P1: (empty at start; populated during TC#5-#6)
  - P2: "Staging", "Production"
- **Runs** (preload for delete-guard tests):
  - 1 run referencing P1's "Staging" env (for TC#16)
  - 5 runs referencing P1's "Prod" env (for TC#17)
  - 3 completed runs referencing P1's "QA" env (for TC#18)

### Cleanup
- Delete all newly created environments post-test
- Do NOT delete pre-loaded runs (they anchor the delete-guard tests)

---

## Open Questions / Clarifications

1. **Delete-guard TOCTOU race condition**  
   The code pre-counts runs + acquires row lock, but a TOCTOU window exists between count and delete. The FK constraint is the load-bearing backstop. Question: Is this acceptable, or should the test attempt to trigger the race? _Answer_: Accept as design tradeoff; test can't reliably trigger; FK guard is sufficient.

2. **UI error message parsing**  
   When API returns 409 `conflict` with `run_count` in the body, does the UI parse and render "in use by N run(s)", or does it show a generic message? _Action_: Observe during Stage 2 execution (TC#25).

3. **Form state on validation error**  
   On validation error (422), does the form preserve user input or clear it? _Expected_: Preserve (UX best practice). _Action_: Verify during TC#23.

4. **List ordering**  
   Should environment list be ordered by creation date or alphabetically by name? _Code check_: Verify in Stage 2 (TC#6).

---

## Pass Criteria

**Blocking (P0 — must pass)**:
- All P0 RLS tests (TC#1–3) pass: multi-tenancy isolation verified
- All P1 uniqueness tests (TC#5–14) pass: no silent duplication
- All P2 delete-guard tests (TC#15–18) pass: run references protected
- No critical or major defects open

**Optional (P2 — defer if needed)**:
- P2 happy-path tests (TC#19–25) — if happy path fails after guards pass, issue is likely UI-only (low priority)

---

## Test-Design Doctrine Verification Checklist

- [x] AC coverage: Every AC expanded 1:N (not 1:1). Justification: ACs are broad business statements; test cases derive specific partitions (RLS, uniqueness, delete guard, happy path) per technique.
- [x] Technique mix applied: 
  - **EP** (Equivalence Partitioning): valid name vs invalid name (empty, >50 chars, only spaces) vs conflict (name exists)
  - **BVA** (Boundary Value Analysis): name length boundaries (0, 1, 50, 51), run count (0, 1, 5)
  - **State/Transition**: environment lifecycle (create → list → rename → delete)
  - **Error-guessing**: RLS bypass, case-sensitivity bypass, whitespace bypass, race condition on delete
  - **Decision Tables**: Implied in auth scenario (role × operation → allowed/denied)
- [x] TC naming consistent: `BK-148: TC#{N}: Validate {CORE} {CONDITIONAL}` throughout
- [x] Test data spec complete: Workspaces, users, projects, environments, runs, cleanup
- [x] Open questions identified and flagged (3 clarifications needed before Stage 2)
- [x] Pass criteria are testable (not vague): P0 = RLS + uniqueness + delete guard; P2 = happy path
- [x] Preconditions and expectations spelled out per TC (one-liner is sufficient for ATP; Stage 2 adds detail)

---

## Risk Summary & Decision

**Overall Story Risk**: 125 CRITICAL  
- RLS isolation broken → platform data breach → 5×5×5 = 125 CRITICAL
- Uniqueness bypass → silent duplication → 3×3×3 = 27 MEDIUM + (implied by design complexity) → escalate to 60 HIGH
- Delete guard incomplete → orphaned run references → 3×3×3 = 27 MEDIUM → escalate to 50 HIGH per code tradeoff

**Blocking Scenarios**: Scenarios 1–3 (RLS, uniqueness, delete guard) are P0; cannot release without all passing.

**Deferred to Stage 2 (if blocker emerges)**: Happy path (Scenario 4) is P2; if happy path breaks after guards pass, likely UI-only — can defer fix if time-boxed.

**Regression Impact**: YES. RLS or uniqueness break is platform-level defect; affects all projects / workspaces.

---

## Next: Stage 2 Execution

Ready to execute all TCs on staging. Test data is preloadable. Outstanding clarifications (3) should be resolved during execution (TC observation can answer them).

**Entry point**: Stage 2 Execution subagent (manual QA on staging via browser + API).
