# Shift-Left Refinement — BK-27: TMS-Test Builder

**Date:** 2026-06-06  
**Epic:** BK-24 (Tests — chains of ATCs)  
**Jira Key:** [BK-27](https://upexgalaxy67.atlassian.net/browse/BK-27)

---

## Story Summary

Elena (QA Engineer) assembles reusable Test chains by selecting and ordering ATCs from her workspace library. The Test becomes the foundational entity for manual execution runs — turning isolated ATC assets into runnable end-to-end validation flows.

---

## Critical Analysis

### Code Feasibility
**Verdict:** 🟡 **YELLOW** — Entity is new; DB schema (`tests` table + RLS policies) must be created; API route scaffold exists in epic scope (FR BK-015, BK-016, BK-017) but implementation is WIP.

**Evidence:**
- `tests` table does NOT exist in current migrations (0001–0020; checked 0014 soft-delete comment confirms future epic status)
- No frontend route yet (`app/(app)/workspace/.../tests/new` is not scaffolded)
- Backend must create: `tests` table, `test_atc_chain` junction table (position-ordered), RLS policies for RBAC
- Idempotency gate already exists: `idempotency_keys` table (0001) + pattern proven by ATC creation (0007)
- Activity log pattern proven: migrations use `service_role` writes (0005 helpers)

### RBAC Coverage
**Verdict:** 🟢 CLEAR — Story explicitly states role rules; RLS pattern is proven across `user_stories`, `atcs`, `acceptance_criteria`.

**Decision point for Dev:**
- Viewer → READ only (enforce in RLS `with check`)
- Member, admin, owner → READ + CREATE (enforce in RLS `with check`)
- DELETE / UPDATE coverage deferred to BK-28 (reorder) and backlog stories

### Idempotency & Double-Click Prevention
**Verdict:** 🟢 CLEAR — Business rule #14 requires retry detection. Mechanism exists: `idempotency_keys` table with 24h TTL and `(user_id, endpoint, key)` uniqueness.

**Dev decision point:**
- Does the Test creation endpoint use `Idempotency-Key` header? (Yes, per ATC pattern.)
- Is the key scoped correctly: `(user_id, endpoint, key)` or only `(endpoint, key)`? (Should be user-scoped to allow user A and user B to create with same client-side key.)

### Data Consistency & Workspace Isolation
**Verdict:** 🟢 CLEAR — Business rule #3 enforces cross-workspace ATC rejection. RLS validation proven in `atc_acceptance_criteria` M:N table (0004).

**Implementation gates:**
1. When inserting `test_atc_chain` rows: validate each ATC belongs to the same workspace as the Test.
2. Error message: "You do not have permission to use this ATC" (does NOT say "ATC doesn't exist" per BR#3 — information hiding).
3. Rollback: if ANY ATC fails validation, abort entire creation (atomic transaction).

---

## Story Quality Assessment

### Gaps Identified
None — all critical details are specified.

### Ambiguities Found
None at the user-visible level. Technical clarifications needed for Dev:

1. **Idempotency key scope** — is it `(user_id, endpoint, key)` or `(endpoint, key)`?
   - **Why critical:** if scope is endpoint-only, user A's retry could overwrite user B's Test if they both used the same key (race condition).
   - **Suggested clarity:** "The system uses the Idempotency-Key header. The key must uniquely identify the request per user per endpoint."

2. **ATC validation timing** — when are cross-workspace ATCs rejected?
   - **Current:** "the attempt is rejected" (AC 4).
   - **Clarification needed:** does validation happen BEFORE persisting the Test (atomic rollback), or AFTER?
   - **Recommended:** validate before insert (atomic preferred for data integrity).

3. **Chain order semantics** — is the chain an ordered list or a set?
   - **Current:** BR#11 clarifies "Two ATCs in the same Test can reference the same ATC twice — the chain is a sequence, not a set."
   - **Status:** ✅ clear.

### Testability Validation
**Verdict:** ✅ **Fully testable end-to-end** (UI + API + DB)

- ✅ AC 1: Positive case — all verifiable (title in list, order preserved, activity log written).
- ✅ AC 2: Negative case — validation message visible; no DB entry created.
- ✅ AC 3: Idempotency — two identical requests → one Test in DB (verifiable via DB query).
- ✅ AC 4: RBAC rejection — error message observable; no Test created (no DB leakage of foreign ATC).

---

## Refined Acceptance Criteria

All 4 original AC remain valid. No new AC inferred. ACs are already precise (Gherkin with specific data, no vague terms).

### AC 1: Elena assembles a Test from three ATCs
```gherkin
Scenario: Elena assembles a Test from three ATCs
  Given Elena is signed in to workspace "Acme QA" with role "member"
    And the workspace has three published ATCs in the library:
      | slug          | description         |
      | open-cart     | Open product page   |
      | click-add     | Click add-to-cart   |
      | verify-count  | Verify cart counter |
  When Elena opens the "New Test" form
    And enters the title "Add to Cart from Empty State"
    And selects the three ATCs in order: [open-cart, click-add, verify-count]
    And clicks "Save"
  Then the Test is created in her workspace "Acme QA"
    And appears in her Test list with the title "Add to Cart from Empty State"
    And opening the Test shows the three ATCs in the exact order [open-cart, click-add, verify-count]
    And the activity log of her workspace records:
      | action      | actor  | object  | timestamp |
      | Test.create | Elena  | <TEST>  | <NOW>     |
```
**Type:** Positive | **Priority:** Critical | **Test level:** E2E (UI + API + DB)

---

### AC 2: Saving a Test without any ATC is blocked
```gherkin
Scenario: Saving a Test without any ATC is blocked
  Given Elena is on the "New Test" form
    And enters the title "Add to Cart from Empty State"
    And no ATC is selected (atc_chain is empty)
  When she clicks "Save"
  Then the save is blocked (request returns 400 Bad Request or 422 Unprocessable Entity)
    And the error message displays: "A Test must include at least one ATC"
    And no Test is created in her workspace
    And activity log has no entry for this attempt
```
**Type:** Negative | **Priority:** Critical | **Test level:** E2E (UI + API)

---

### AC 3: Accidentally clicking Save twice does not create duplicates
```gherkin
Scenario: Double-click on Save button within idempotency window
  Given Elena has filled the "New Test" form correctly with:
    | field | value                          |
    | title | Add to Cart from Empty State   |
    | atcs  | [open-cart, click-add, verify] |
  When she clicks "Save"
    And (due to slow network) her browser has not yet received a response
    And Elena clicks "Save" again within 1 second
  Then exactly one Test titled "Add to Cart from Empty State" is created
    And Elena sees the Test exactly once in her Test list
    And the activity log records one Test.create event (not two)
    And the second request returns the same Test ID as the first (idempotent)
```
**Type:** Edge | **Priority:** High | **Test level:** E2E (UI + API + idempotency)

**NEEDS PO/DEV CONFIRMATION:**
- What HTTP status code indicates idempotency success? (200 OK or 201 Created both acceptable; suggest 200 for retry, 201 for original)
- What is the idempotency window? (Recommend: 24h, matching `idempotency_keys` TTL)

---

### AC 4: Elena cannot use ATCs from a workspace she does not belong to
```gherkin
Scenario: Attempt to create Test with foreign-workspace ATC
  Given Elena belongs to workspace "Acme QA" but NOT to workspace "Other Co"
    And "Other Co" has a published ATC with slug "secret-atc" (id: <FOREIGN_ATC_ID>)
  When Elena attempts to create a Test in "Acme QA"
    And selects the ATC <FOREIGN_ATC_ID> in the chain
    And clicks "Save"
  Then the creation is rejected with HTTP 403 Forbidden or 400 Bad Request
    And the error message displays: "You do not have permission to use this ATC"
    And NO information is revealed about whether <FOREIGN_ATC_ID> exists
    And no Test is created in "Acme QA"
    And activity log has no entry for this attempt
    And the foreign ATC in "Other Co" is unaffected
```
**Type:** Negative (Security) | **Priority:** Critical | **Test level:** E2E (API + RBAC)

**NEEDS PO/DEV CONFIRMATION:**
- Should the error be returned BEFORE any DB write, or AFTER validation (atomic)? (Recommend: before, for fail-fast and data integrity.)
- What if the user selects a mix of valid + invalid ATCs? (Recommend: reject the entire request, not partially.)

---

## Acceptance Test Plan (ATP) — DRAFT Outline

### Positive Scenarios
**Rationale:** Elena is the primary user; happy path verifies core functionality end-to-end. Boundary cases (1 ATC, many ATCs) test order preservation at scale.

- Should create a Test with a single ATC and preserve it in the chain — precondition: workspace with ≥1 published ATC
- Should create a Test with three ATCs in exact order — precondition: workspace with ≥3 published ATCs
- Should create a Test with ten ATCs in exact order — precondition: workspace with ≥10 published ATCs, verifies order at scale
- Should display newly created Test immediately in the Test list — precondition: Test just created, user on Test list page
- Should preserve Test title exactly as entered (including spaces, punctuation, mixed case) — precondition: user enters "Add  to   Cart !!!" (extra spaces, punctuation)

### Negative Scenarios
**Rationale:** Validation gates (empty chain, invalid input) and permission boundaries (viewer role, foreign ATC).

- Should block Test creation when no ATC is selected — precondition: form filled with title only, chain empty
- Should display error message "A Test must include at least one ATC" when save fails — precondition: empty chain, user clicks Save
- Should reject Test creation from viewer role with HTTP 403 — precondition: Elena has role "viewer" in workspace
- Should reject Test creation when ATC belongs to foreign workspace — precondition: user selects ATC not in their workspace
- Should not reveal whether foreign ATC exists in error message — precondition: user attempts foreign ATC, checks error message for leakage
- Should block Test creation with whitespace-only title (title: "   " or "\t\n") — precondition: user enters only whitespace in title field

### Boundary Scenarios
**Rationale:** Title and chain limits; data type edge cases.

- Should accept a 200-character title (exact limit) — precondition: title is exactly 200 chars
- Should reject a 201-character title (over limit) — precondition: title is 201 chars
- Should accept special characters in title (emoji, accented chars) — precondition: title contains "Café ☕ Test"
- Should accept a Test title with leading/trailing spaces after trim — precondition: title is " Add to Cart " (with leading/trailing)
- Should accept a Test with the same ATC twice in the chain — precondition: chain is [atc-1, atc-2, atc-1] (duplicate in sequence)
- Should accept a Test with max chain length (assume: 100 ATCs) — precondition: user selects 100 distinct ATCs in order
- Should reject a Test chain with 101 ATCs (if limit enforced) — precondition: user attempts to add 101st ATC

### Integration Scenarios
**Rationale:** Cross-layer integration (UI ↔ API ↔ DB); idempotency; audit trail.

- Should write activity log entry when Test is created — precondition: Test created, check activity_log table
- Should link activity log entry to the correct workspace — precondition: user in workspace "Acme QA", verify log entry scoped to workspace
- Should link activity log entry to the correct user — precondition: Elena creates Test, verify log entry shows Elena's user_id
- Should link activity log entry to the correct Test — precondition: Test created, verify log entry references correct Test ID
- Should return Test ID in creation response (for API clients) — precondition: POST /api/v1/tests with valid payload
- Should idempotently return same Test ID when request is retried with same Idempotency-Key — precondition: same request sent twice within TTL window
- Should accept Test creation from API client with Bearer PAT (headless) — precondition: AI agent authenticates with PAT, POST /api/v1/tests

---

## Coverage Estimate

| Scenario type | Count | Notes |
|---|---|---|
| Positive | 5 | Happy path with 1/3/10 ATC chain lengths + list visibility + title preservation |
| Negative | 6 | Empty chain, no title, viewer role, foreign ATC, leakage check, whitespace title |
| Boundary | 7 | Title length (200/201), special chars, whitespace trim, duplicate ATC, chain length (100/101) |
| Integration | 7 | Activity log (workspace/user/Test linkage), API response, idempotency, headless PAT |
| **Total** | **25** | Comprehensive coverage across permission, data validation, audit, and end-to-end flows |

---

## Edge Cases & Risk Areas

### Concurrency
**Risk:** User A and user B both click Save with the same client-generated Idempotency-Key (e.g., both using same CI pipeline run ID).

**Mitigation outline:** Idempotency key is scoped to `(user_id, endpoint, key)` — same key from different users → different Tests (not collision).

**Test outline:** "Should allow two users to create Tests with the same Idempotency-Key without collision"

**Priority:** High (data integrity) | **Add to ATP?** Yes

---

### Data Limits
**Risk:** Title exceeds 200 chars; chain exceeds system limits; description field missing (not in scope for BK-27 but infer from BR).

**Current:** BR#16 — "title ... limited to 200 characters. Whitespace-only titles are rejected."

**Clarification needed:** Is there a max chain length? (Recommend: no hard limit in MVP; soft limit (e.g., 100) for UI UX.)

**Test outlines:**
- "Should reject title at 201 characters" (negative)
- "Should accept a chain of 100 ATCs" (boundary)

**Priority:** Medium | **Add to ATP?** Yes (boundary already outlined above)

---

### Permission Boundaries
**Risk:** RLS policy misconfiguration allows viewer to create Test; admin in workspace A reads workspace B's ATCs.

**Current:** BR#12 — "Only workspace members with role `member`, `admin`, or `owner` can create Tests. Role `viewer` is read-only by design."

**Mitigation:** RLS checks at two gates:
1. INSERT policy on `tests` table: require `workspace_members.role IN ('member','admin','owner')`
2. INSERT policy on `test_atc_chain` table: for each ATC, validate it belongs to the same workspace as the Test (prevents cross-workspace injection)

**Test outlines:**
- "Should reject Test creation from viewer role with 403" (negative)
- "Should reject Test with foreign-workspace ATC without information leakage" (negative, already outlined AC 4)

**Priority:** Critical (security) | **Add to ATP?** Yes (already outlined)

---

### Idempotency
**Risk:** Retry mechanism fails; second request creates duplicate Test instead of returning original.

**Current:** BR#14 — "Repeating the exact same creation request within a short window (because of a retry or a double-click) must produce one Test, not many."

**Implementation gate:** Use `idempotency_keys` table (0001 migration). Pattern proven in ATC creation (0007).

**Test outline:** "Should idempotently return same Test ID when request is retried with same Idempotency-Key" (integration, already outlined above)

**Priority:** High (UX + data integrity) | **Add to ATP?** Yes

---

### Orphaned State
**Risk:** User selects ATC, then that ATC is deleted mid-flow (after user clicks Select but before Save).

**Mitigation:** ATC is deleted via soft-delete (0014 `archived_at` column). Soft-deleted ATCs should be filtered from the ATC picker UI. At save time, if user somehow selects archived ATC, reject with "This ATC is no longer available" (graceful error, not data loss).

**Test outline:** "Should reject Test creation if any selected ATC has been archived since selection"

**Priority:** Medium | **Add to ATP?** Yes (edge case clarification)

---

### Audit Trail
**Risk:** Activity log entry is never written; audit trail is incomplete.

**Current:** BR#13 — "A Test creation cannot be silently lost. Every successful creation produces an activity-log entry that the workspace owner can audit."

**Implementation gate:** Trigger AFTER INSERT on `tests` table (via `service_role` function) writes to `activity_log` with action='Test.create', actor=user_id, object=test_id, timestamp=now().

**Test outline:** "Should write activity log entry with correct workspace_id, user_id, Test ID, and timestamp" (integration, already outlined)

**Priority:** High (compliance) | **Add to ATP?** Yes

---

## Open Questions for PO / Dev

### For PO (Requirements Clarification)

1. **Idempotency window** — how long should a retried request be considered a duplicate?
   - **Blocks:** AC 3 (double-click) implementation + Test ATP
   - **Suggested answer:** 24 hours (matches `idempotency_keys` table default TTL)

2. **Max chain length** — is there a hard limit on the number of ATCs in a single Test?
   - **Blocks:** boundary ATP outline (currently assume 100 as soft limit for UI UX)
   - **Suggested answer:** No hard limit in MVP; soft UI limit (e.g., 100) for UX; raise in Phase 2 if users hit it

3. **Test description field** — is the title the only metadata, or do Tests have a description field?
   - **Why:** BR#16 specifies title rules but silent on description; out-of-scope confirmation needed
   - **Blocks:** not critical (out-of-scope for BK-27), but clarify for future backlog stories

### For Dev (Technical Clarification)

4. **Idempotency-Key scope** — is the uniqueness constraint `(user_id, endpoint, key)` or just `(endpoint, key)`?
   - **Why critical:** prevents race condition where user A's retry overwrites user B's Test
   - **Blocks:** AC 3 implementation + ATP for idempotency
   - **Recommended:** `(user_id, endpoint, key)` (user-scoped for safety)

5. **ATC validation timing** — when are cross-workspace ATCs rejected: before or after Test insert?
   - **Why:** affects atomicity (rollback safety) and error message specificity
   - **Blocks:** AC 4 implementation + ATP for cross-workspace boundary
   - **Recommended:** validate ALL ATCs before insert → atomic failure (fail-fast)

6. **RLS policy for ATC in foreign workspace** — does the insert of `test_atc_chain` check workspace membership?
   - **Why:** ensures foreign ATC cannot be added even if RLS on `atcs` is bypassed
   - **Blocks:** AC 4 implementation + ATP for RBAC
   - **Recommended:** explicit check: `exists(select 1 from atcs a join tests t on ... where a.workspace_id = t.workspace_id)`

7. **Error message for foreign ATC** — should it reveal the ATC slug or ID?
   - **Why:** BR#3 states "does not reveal whether the foreign ATC exists"
   - **Blocks:** AC 4 implementation + ATP for information hiding
   - **Recommended:** generic message "You do not have permission to use this ATC" (no ATC reference)

8. **Activity log actor field** — should it store `user_id` or `user.email`?
   - **Why:** audit readability + traceability
   - **Blocks:** not critical (proven pattern in existing migrations), but confirm for consistency
   - **Recommended:** store `user_id` (immutable, FK reference); PO can join to auth.users for email if needed

---

## Traceability

- **Story link:** [BK-27](https://upexgalaxy67.atlassian.net/browse/BK-27)
- **Epic link:** [BK-24](https://upexgalaxy67.atlassian.net/browse/BK-24) (Tests — chains of ATCs)
- **Source FRs:** BK-015 (POST /tests), BK-016 (PATCH reorder), BK-017 (GET expanded read)
- **Related flows:** (from business-data-map.md) — ATCs are authored in FEAT-021, 022, 023, 024; Tests consume ATCs to enable manual execution (FEAT-025, planned)
- **Related features:** (from business-feature-map.md) — Tests depend on FEAT-021–024 (ATC stable); Tests enable FEAT-025 (Runs, planned)
- **Dependency:** requires EPIC BK-13 (ATC Library) closed ✅ (based on story status "Shift-Left QA")

---

## Next Steps

1. **PO Review** — confirm answers to questions 1–3 above
2. **Dev Technical Clarification** — confirm answers to questions 4–8 above
3. **Phase 3 Handoff** — once clarifications are complete, run `/sprint-testing` to execute this refined ATP against staging during sprint execution

---

_Refined by AI on 2026-06-06 | Phase 2 (Story Quality Analysis) — Shift-Left Testing_
