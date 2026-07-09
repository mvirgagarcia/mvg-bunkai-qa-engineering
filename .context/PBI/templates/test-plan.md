# Test Plan — Format Reference Guide

> **This is a format-reference guide, NOT a per-ticket authoring target.**
> Per-ticket test plans are produced by `/sprint-testing` and stored locally under
> `.context/PBI/epics/EPIC-BK-*/stories/STORY-BK-*/`. The shape below is the
> canonical format for human reference — do not fill this file with real ticket data.

---

## Header

| Field | Value |
|---|---|
| **Story Key** | BK-[number] |
| **Story Title** | [Story title from Jira] |
| **Epic** | BK-[epic-number] — [Epic Name] |
| **Sprint** | [Sprint Name] |
| **QA Assignee** | [name] |
| **Plan Date** | [YYYY-MM-DD] |
| **Status** | Draft / Ready / In Test / QA Approved |

---

## AC → TC Mapping

| AC | AC Description | TC IDs | Priority | Automatable |
|---|---|---|---|---|
| AC1 | [Short AC descriptor] | TC-001, TC-002 | High | Yes |
| AC2 | [Short AC descriptor] | TC-003 | Medium | Yes |
| AC3 | [Short AC descriptor] | TC-004, TC-005 | High | No |

> TC IDs are local to this plan (TC-001, TC-002...). When promoted to Xray via
> `bun xray`, they receive a Jira `Test` issue key (BK-XXX).

---

## Scope

### In Scope

- [Functional area 1 covered by this plan]
- [Functional area 2 covered by this plan]
- [Happy path + primary error paths for the ACs above]

### Out of Scope

- [Adjacent feature NOT tested in this plan — link to its own plan if it exists]
- [Non-functional requirements deferred to a separate spike]
- [Anything explicitly excluded per the story's Out of Scope field]

---

## Test Types

| Type | Required | Reason |
|---|---|---|
| Functional | Yes | Core AC validation — behavior correct per spec |
| UI (E2E) | [Yes/No] | User journey involves browser interaction |
| API | [Yes/No] | Story exposes or modifies an API endpoint |
| Performance | [Yes/No] | Story touches a high-traffic path or has SLA |
| Security | [Yes/No] | Auth, RBAC, PII, or injection surface affected |
| Accessibility (A11y) | [Yes/No] | New UI component introduced |

---

## Test Environments

| Environment | URL | When to Use |
|---|---|---|
| Local | http://localhost:3000 | Developer smoke check before PR |
| Staging | https://staging-upexbunkai.vercel.app | Primary QA execution environment |
| Production smoke | https://upexbunkai.vercel.app | Post-deploy verification only (read-only paths) |

> Default environment: **staging** (per `.agents/project.yaml → testing.default_env`).

---

## Test Data Requirements

| Entity | Value / Strategy | Notes |
|---|---|---|
| User (primary persona) | From `.env` — `LOCAL_USER_EMAIL` / `LOCAL_USER_PASSWORD` | Staging credentials only |
| [Secondary persona] | [describe or reference `.env` key] | [any special setup needed] |
| [Fixture data] | [describe seed or factory approach] | [e.g., pre-existing record BK-999] |
| [Edge-case data] | [boundary value, empty state, large payload] | [source or creation steps] |

> Never hardcode credentials. All test data sourced from `.env` or Faker-generated fixtures.

---

## Test Cases

### TC-001 — [Short descriptor]

| Field | Value |
|---|---|
| **Priority** | Critical / High / Medium / Low |
| **Type** | Functional / UI / API / Performance / Security / A11y |
| **AC Ref** | AC1 |
| **Automatable** | Yes / No |

**Precondition:** [State the system must be in before executing]

**Steps:**
1. [Action 1]
2. [Action 2]
3. [Action N]

**Expected Result:** [What must be true after step N for the TC to PASS]

---

### TC-002 — [Short descriptor]

| Field | Value |
|---|---|
| **Priority** | High |
| **Type** | Functional |
| **AC Ref** | AC1 |
| **Automatable** | Yes |

**Precondition:** [State the system must be in before executing]

**Steps:**
1. [Action 1]
2. [Action 2]

**Expected Result:** [Pass criteria]

---

> Add TC-003, TC-004... following the same pattern.

---

## Edge Cases and Negative Tests

| TC ID | Scenario | Input / Condition | Expected Outcome |
|---|---|---|---|
| TC-E01 | Empty required field | Submit form with [field] blank | Validation error shown, no submit |
| TC-E02 | Boundary value | [field] = max allowed length + 1 | Truncation or rejection |
| TC-E03 | Unauthorized access | Non-admin user accesses admin route | 403 / redirect to login |
| TC-E04 | Network error | API returns 500 | User-visible error message, no data loss |
| TC-E05 | Duplicate submission | Submit same form twice rapidly | Second submission rejected or idempotent |

---

## Dependencies, Blockers, and Risks

| Type | Description | Owner | Status |
|---|---|---|---|
| Dependency | [External service / feature that must be ready] | [Team/Person] | [Ready / Pending] |
| Blocker | [Something preventing QA from starting] | [Team/Person] | [Active / Resolved] |
| Risk | [Potential failure mode or ambiguity] | QA | [Mitigated / Open] |

---

## Execution Checklist

Before starting test execution:

- [ ] Story is in `Ready For QA` status in Jira
- [ ] Build is deployed to staging (or target env)
- [ ] Test data / fixtures prepared
- [ ] Credentials confirmed working (`.env` values valid)
- [ ] Regression suite passed (no pre-existing failures)

During execution:

- [ ] Each TC result logged (Pass / Fail / Blocked)
- [ ] Failing TCs have linked bug reports (BK-XXX)
- [ ] Evidence captured for failed TCs (screenshot, trace, log)

---

## Sign-Off

| Role | Name | Date | Decision |
|---|---|---|---|
| QA Engineer | [name] | [YYYY-MM-DD] | Approved / Blocked |
| Dev Owner | [name] | [YYYY-MM-DD] | Acknowledged |

**QA Verdict:** Pass (QA Sign-Off) / Fail (Defect Reported — story → BLOCKED)

> After sign-off, transition story in Jira:
> - Pass → `qa_sign_off` transition → `QA Approved`
> - Fail → `defect_reported` transition → `BLOCKED` (links bug BK-XXX)

---

## Discovery Gaps

> Gaps specific to this format-reference that were not verifiable at Phase 4 time.

- Test Plan custom field (`customfield_10211` — `🧪 Feature Test Plan (QA)`) exists in Jira — confirm whether this plan is stored there or only locally in `.context/PBI/`.
- Xray TMS integration active (`bun xray`) — confirm whether TCs in this plan are promoted to Xray `Test` issues or remain local-only until `/test-documentation` runs.
- Production smoke scope not defined — confirm which routes are safe to hit in production (read-only vs write paths).
