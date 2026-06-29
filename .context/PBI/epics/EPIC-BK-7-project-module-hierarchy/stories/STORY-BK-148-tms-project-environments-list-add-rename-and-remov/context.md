# Session Context — BK-148: TMS-Project Environments

**Jira Key**: [BK-148](https://jira.upexgalaxy69.atlassian.net/browse/BK-148)  
**Epic**: [BK-7](https://jira.upexgalaxy69.atlassian.net/browse/BK-7) — Project & Module Hierarchy  
**Type**: Historia (User Story)  
**Status**: Ready For QA  
**Story Points**: 1  

## Story Statement

As a Senior QA Engineer, I want to manage the list of environments for a project (list, add, rename, and remove) so that I can keep the run targets accurate and start manual runs against the right environment.

## Definition of Done

- A project member can open the project's environment list and see every environment for that project.
- A project member can add, rename, and remove an environment, with the uniqueness and trimming rules enforced.
- Removing an environment that a Run already references is handled safely per the agreed business rule (default: blocked, with a clear message).
- The happy-path, validation, and guard scenarios in the Acceptance Criteria are demonstrably met on staging.
- Acceptance criteria validated; no critical or major defects open.

## Team Discussion Summary

**From Ely (6/20/2026)**:

Design approach is **live-first** — no dedicated mockup exists. The Environments UI is built against the project settings / project-config area (project-scoped "Environments" section), reusing frozen design tokens and existing list/form patterns from the project shell. When a Settings mockup is authored later, the Environments section will be added.

**PR Status**: Merged as of 6/20/2026 — implementation is complete and awaiting QA.

## Feature Context

This story is part of **FEAT-025: Test Run Execution** (Planned feature).

- **Related**: [BK-34](https://jira.upexgalaxy69.atlassian.net/browse/BK-34) — TMS-Run Execution | Start a manual run in a chosen environment (QA Approved)
- **Data Model**: Environments are project-scoped. Removing an environment that a Run references is blocked with a clear message per business rule.
- **Surfaces to Test**: UI (project settings), API (CRUD endpoints), DB (environment table + RLS isolation)

## Key Questions (TBD by Stage 1)

- Where are the environment endpoints in the API? (Search for `environments` routes in `/app/api/v1/`)
- Is there a migration for the `environments` table? (Check `/supabase/migrations/`)
- What are the uniqueness and trimming rules exactly?
- What is the "agreed business rule" for removing an environment with an active Run reference?

## Notes

- Live-first design — test against actual UI, not mockups
- This is a feature extension post-MVP (label: `post-mvp`)
- Depends on Run Execution infrastructure being in place
