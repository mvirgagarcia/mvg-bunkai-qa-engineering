# Bug Report — Format Reference Guide

> **This is a format-reference guide, NOT a per-ticket authoring target.**
> Per-ticket bug content is synced from Jira (source of truth) by `/sprint-testing`
> via `bun run jira:sync-issues get <KEY> --include-comments`. Do not fill this file
> with real bug data — it documents the canonical shape for human reference only.

---

## Bug Summary (one line)

```
[Short, scannable description]: [What broke] on [where/when]
```

> Example: "Checkout button disabled after address validation fails — payment flow blocked"

---

## Environment

| Field | Value |
|---|---|
| **Environment** | staging / production / local |
| **App URL** | [URL where bug was found] |
| **Browser** | [Chrome 124 / Firefox / Safari / Edge + version] |
| **OS** | [macOS 14 / Windows 11 / iOS 17 / Android 14] |
| **User Type** | [guest / registered user / admin / [persona]] |
| **Date & Time** | [YYYY-MM-DD HH:MM UTC] |
| **App Version / Build** | [version string or commit SHA if known] |

---

## Steps to Reproduce

1. [Precondition: describe the starting state — logged in as X, on page Y, with Z data]
2. [Step 2: exact action taken]
3. [Step 3: exact action taken]
4. [Step N: last action before the bug manifests]

---

## Expected Result

```
[What the system SHOULD do per the acceptance criteria or spec]
```

---

## Actual Result

```
[What the system ACTUALLY did — be precise: error message text, wrong value, missing element, crash]
```

---

## Evidence

| Type | Link / Description |
|---|---|
| Screenshot | [attach or paste URL] |
| Console log | [paste relevant error lines or attach file] |
| Network request | [paste relevant request/response or HAR file] |
| Video recording | [attach or paste URL] |
| Trace file | [Playwright trace URL / path if available] |

> Attach evidence files to the Jira issue via `customfield_10140` (🧫EVIDENCE).

---

## Impact

| Field | Value |
|---|---|
| **Severity** | Critical / High / Medium / Low (see guide below) |
| **Error Type** | functional / visual / data / crash / integration / performance / security / content |
| **Frequency** | Always (siempre) / Occasional (ocasional) / Rare (raro) |
| **Users Affected** | [all users / logged-in users / admins / specific segment] |
| **Workaround** | [steps to unblock users, or "None"] |
| **Business Risk** | [describe impact on user journeys, revenue, or data integrity] |

---

## Severity Guide

| Severity | Criteria | Example |
|---|---|---|
| **Critical** | System down, data loss, security breach, complete feature unavailable with no workaround | Cannot log in, payment always fails, PII exposed |
| **High** | Major feature broken, no reasonable workaround, affects most users | Cannot create a new test case, dashboard crashes on load |
| **Medium** | Feature impaired but workaround exists, limited user impact | Filter returns wrong results but manual scroll works |
| **Low** | Cosmetic issue, minor UX friction, no functional impact | Typo in label, button misaligned by 2px |

> Map to Jira `severity` field (`customfield_10177`): `critica` / `mayor` / `moderada` / `menor` / `trivial`.

---

## Regression Flag

- [ ] **Worked before** — was working in a previous build/sprint
- [ ] **Never worked** — feature has never functioned correctly
- [ ] **Unknown** — insufficient data to determine

---

## Related Issues

| Relationship | Issue Key | Summary |
|---|---|---|
| Blocks | BK-[number] | [story/task blocked by this bug] |
| Duplicate of | BK-[number] | [original bug if this is a dup] |
| Related to | BK-[number] | [related story or another symptom] |

---

## Custom Fields (Jira)

> These map to required fields in `.agents/jira-required.yaml`.

| Field | Jira Field | Notes |
|---|---|---|
| Actual Result | `customfield_10133` | Observed behavior |
| Expected Result | `customfield_10137` | Expected behavior per AC |
| Error Type | `customfield_10190` | Bug taxonomy option |
| Severity | `customfield_10177` | Severity classification option |
| Test Environment | `customfield_10136` | Where bug was found (option) |
| Root Cause | `customfield_10118` | Post-mortem cause (set after fix) |
| Workaround | `customfield_10109` | Temporary mitigation text |
| Evidence | `customfield_10140` | Screenshots, traces, logs |
| Fix | `customfield_10114` | bugfix or hotfix (set after fix) |
| Repro Steps | `customfield_10218` | Input steps for reproduction |
| Frequency | `customfield_10155` | siempre / ocasional / raro |

---

## Discovery Gaps

> Gaps specific to this format-reference that were not verifiable at Phase 4 time.

- Severity option labels use Spanish slugs in Jira (`critica`, `mayor`, `moderada`, `menor`, `trivial`) — confirm team convention for mapping to English severity levels in reports.
- Frequency field (`customfield_10155`) uses Spanish option labels (`siempre`, `ocasional`, `raro`) — confirm whether team uses these or has separate English aliases.
- Bug workflow does not include a `Shift-Left QA` state — confirm bugs discovered pre-sprint go directly to `Open` rather than through a pre-triage path.
