# User Story — Format Reference Guide

> **This is a format-reference guide, NOT a per-ticket authoring target.**
> Per-ticket story content is synced from Jira (source of truth) by `/sprint-testing`
> via `bun run jira:sync-issues get <KEY> --include-comments`. Do not fill this file
> with real ticket data — it documents the canonical shape for human reference only.

---

## Story Header

| Field | Value |
|---|---|
| **Issue Key** | BK-[number] |
| **Epic** | BK-[epic-number] — [Epic Name] |
| **Sprint** | [Sprint Name] |
| **Story Points** | [estimate] |
| **Status** | [current workflow status] |
| **Assignee** | [name] |

---

## User Story

```
As a [persona]
I want to [action]
So that [benefit]
```

> Placeholder tokens: `[persona]` = user role (e.g., "registered user", "admin", "guest").
> `[action]` = concrete system action (e.g., "reset my password via email link").
> `[benefit]` = business or user value (e.g., "regain access without contacting support").

---

## Acceptance Criteria

Each AC maps to one or more test cases. Write them as Given/When/Then.

**AC1 — [Short descriptor]**

```
Given [precondition / initial state]
When [user action or system event]
Then [expected observable outcome]
```

**AC2 — [Short descriptor]**

```
Given [precondition / initial state]
When [user action or system event]
Then [expected observable outcome]
```

> Add AC3, AC4... as needed. Keep each AC independent of the others.

### AC Quality Checklist

Before marking ACs ready for QA, verify each one is:

- [ ] **Specific and measurable** — outcome can be observed and confirmed (not "works correctly")
- [ ] **Testable** — can be automated or executed manually with a pass/fail result
- [ ] **Independent** — does not assume or depend on another AC being true
- [ ] **Business-focused** — describes user/business value, not implementation detail

---

## Technical Notes

Check all that apply for this story:

- [ ] **API changes** — new endpoint, changed request/response shape, auth scope change
- [ ] **Database changes** — new table/column, migration, index, data seeding required
- [ ] **UI changes** — new component, route, form, or layout affected
- [ ] **External dependency** — third-party service, webhook, OAuth, email provider
- [ ] **Auth/permission change** — new role, scope, or gate added or removed
- [ ] **Performance consideration** — query cost, rate limit, pagination required
- [ ] **Configuration change** — env var, feature flag, or config file affected

---

## Out of Scope

> List explicitly what this story does NOT cover to prevent scope creep.

- [Out of scope item 1]
- [Out of scope item 2]

---

## Design / Mockups

| Asset | Link |
|---|---|
| Figma / mockup | [URL or "N/A"] |
| User flow diagram | [URL or "N/A"] |

---

## Related Stories

| Relationship | Issue Key | Summary |
|---|---|---|
| Blocked by | BK-[number] | [brief description] |
| Related to | BK-[number] | [brief description] |
| Depends on | BK-[number] | [brief description] |

---

## Custom Fields (Jira)

> These map to required fields in `.agents/jira-required.yaml`.

| Field | Jira Field | Notes |
|---|---|---|
| Acceptance Criteria (Gherkin) | `customfield_10141` | Gherkin format; synced by `jira:sync-issues` |
| Business Rules Specification | `customfield_10134` | Business rules separate from ACs |
| Scope | `customfield_10142` | In-scope / out-of-scope notes |
| Mockup | `customfield_10186` | Link to design asset |
| Workflow | `customfield_10161` | User journey narrative |
| Story Points | `customfield_10035` | Numeric estimate |
| Weblink | `customfield_10159` | External reference URL |
| Acceptance Test Plan (ATP) | `customfield_10120` | QA test plan (jira-native TMS) |
| Acceptance Test Results (ATR) | `customfield_10284` | QA test report (jira-native TMS) |

---

## Discovery Gaps

> Gaps specific to this format-reference that were not verifiable at Phase 4 time.

- AC field (`customfield_10141`) is `✅ Acceptance Criteria (Gherkin)` — confirm teams write Gherkin vs free text in practice.
- Epic hierarchy: confirm whether stories link via `Epic Link` (`customfield_10014`) or `Parent Link` (`customfield_10018`) in this Jira workspace.
- Sprint cadence not verified — sprint field references (`customfield_10020`) resolved, but sprint naming convention unknown.
