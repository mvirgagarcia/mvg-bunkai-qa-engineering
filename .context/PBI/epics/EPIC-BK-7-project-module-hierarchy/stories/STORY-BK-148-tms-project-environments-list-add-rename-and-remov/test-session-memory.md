# Test Session Memory — BK-148

## TMS Modality

**Detected**: jira-native (no Xray Test issues; ATP/ATR stored as Jira custom fields on Story)

- `acceptance_test_plan` field (customfield_10120) — stores ATP on the story
- `acceptance_test_results` field (customfield_10284) — stores ATR on the story
- Custom fields are mirrored as Jira comments for diff history

## Environment Configuration

**Active Environment**: staging  
**Web URL**: https://staging-upexbunkai.vercel.app  
**API URL**: https://staging-upexbunkai.vercel.app/api  
**DB MCP**: staging-dbhub  

## Test User Credentials

From `.env`:

- `STAGING_USER_EMAIL`: [set in .env — read at test time]
- `STAGING_USER_PASSWORD`: [set in .env — read at test time]

**How to Access**:
```bash
# Read from .env at runtime
cat /Users/micaela/Desktop/projects/upex/bunkai-qa-engineering/.env | grep STAGING_USER
```

## Cross-Ticket Traceability

- **Parent Epic**: BK-7 — Project & Module Hierarchy
- **Related Story**: BK-34 — TMS-Run Execution (QA Approved)
- **Feature Coverage**: FEAT-025 (Test Run Execution — Planned)

## Session Metadata

| Key | Value |
|-----|-------|
| **PBI Path** | `.context/PBI/epics/EPIC-BK-7-project-module-hierarchy/stories/STORY-BK-148-tms-project-environments-list-add-rename-and-remov/` |
| **TMS Modality** | jira-native |
| **Session Started** | 2026-06-23 (Stage 0: Session Start) |
| **Next Stage** | Stage 1 — Planning (after user confirmation) |

## Sync Markers

- story.md — synced 2026-06-23 via `bun run jira:sync-issues`
- comments.md — synced 2026-06-23 with `--include-comments`
- acceptance_criteria.md — [PENDING — Stage 1 will fetch from Jira API or derive from story definition]
