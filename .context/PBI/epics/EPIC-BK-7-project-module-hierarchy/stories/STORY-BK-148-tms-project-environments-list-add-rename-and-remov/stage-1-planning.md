# Stage 1: Planning — BK-148 ATP Design

**Date**: 2026-06-26  
**Feature**: TMS-Project Environments (list, add, rename, remove)  
**Endpoints Confirmed**: ✅ All 4 CRUD endpoints implemented + deployed to staging

---

## API Spec (Final)

| Operation | Endpoint | Method | Auth | Status |
|-----------|----------|--------|------|--------|
| List | `/api/v1/projects/{id}/environments` | GET | Bearer PAT | ✅ 200 |
| Create | `/api/v1/projects/{id}/environments` | POST | Bearer PAT | ✅ 201 |
| Rename | `/api/v1/environments/{id}` | PATCH | Bearer PAT | ✅ 200 |
| Delete | `/api/v1/environments/{id}` | DELETE | Bearer PAT | ✅ 200 |

---

## Validation Rules (from code)

**Name validation** (EnvironmentNameSchema):
- Trim whitespace (leading/trailing)
- Min 1 char (required)
- Max 50 chars
- Case-insensitive uniqueness (project-scoped, via DB index `project_environments_project_name_idx`)

**RLS**: Member+ write access (workspace level)

---

## Error Mapping (from `mapEnvironmentRpcError`)

| Scenario | Status | Code | Message |
|----------|--------|------|---------|
| Name empty / > 50 chars | 422 | `validation_failed` | "Name must be between 1 and 50 characters." |
| Duplicate name (case-insensitive) | 409 | `conflict` | "An environment with this name already exists." |
| Environment in use (has runs) | 409 | `conflict` | "This environment is in use by {N} run(s) and cannot be removed." |
| Not a member | 403 | `forbidden` | "You must be a member of this workspace with write access." |
| Missing env/project | 404 | `not_found` | "Environment not found." |
| Internal error | 500 | `internal_error` | (varies) |

---

## Acceptance Test Plan (ATP)

### Happy Path

| # | Scenario | Endpoint | Expected | Priority |
|---|----------|----------|----------|----------|
| **H1** | List environments (empty project) | GET `.../environments` | 200, `{"environments": []}` | P0 |
| **H2** | Create environment (valid name) | POST `.../environments` | 201, returns env object with id/name/created_at | P0 |
| **H3** | List environments (after create) | GET `.../environments` | 200, includes H2 env in list, ordered by name asc | P0 |
| **H4** | Rename environment (valid name) | PATCH `/{env_id}` | 200, returns updated env | P0 |
| **H5** | Delete environment (unused) | DELETE `/{env_id}` | 200, `{"deleted": true}` | P0 |
| **H6** | List environments (after delete) | GET `.../environments` | 200, env no longer in list | P0 |

### Validation Failures

| # | Scenario | Endpoint | Input | Expected | Priority |
|---|----------|----------|-------|----------|----------|
| **V1** | Create — name empty | POST `.../environments` | `{"name": ""}` | 422, `validation_failed` | P1 |
| **V2** | Create — name only spaces | POST `.../environments` | `{"name": "   "}` | 422, `validation_failed` (trim empty → fail) | P1 |
| **V3** | Create — name > 50 chars | POST `.../environments` | `{"name": "x" * 51}` | 422, `validation_failed` | P1 |
| **V4** | Create — name with leading/trailing spaces | POST `.../environments` | `{"name": "  Staging  "}` | 201, persists as "Staging" (trimmed) | P1 |
| **V5** | Rename — same rules as create | PATCH `/{env_id}` | (empty, spaces, > 50) | Same 422 errors | P1 |

### Conflict Scenarios

| # | Scenario | Endpoint | Setup | Expected | Priority |
|---|----------|----------|-------|----------|----------|
| **C1** | Create — duplicate name (exact case) | POST `.../environments` | Env "Staging" exists | 409, `conflict` ("already exists") | P1 |
| **C2** | Create — duplicate name (different case) | POST `.../environments` | Env "staging" exists | 409, `conflict` (case-insensitive) | P1 |
| **C3** | Rename — to existing sibling name | PATCH `/{env_id}` | Env1="Staging", Env2="Dev"; rename Env2→"Staging" | 409, `conflict` | P1 |
| **C4** | Delete — environment in use | DELETE `/{env_id}` | Run references env | 409, `conflict` ("in use by N run(s)") | P2 |

### Security / Authorization

| # | Scenario | Endpoint | Setup | Expected | Priority |
|---|----------|----------|-------|----------|----------|
| **S1** | Non-member create | POST `.../environments` | User not workspace member | 403, `forbidden` | P2 |
| **S2** | Non-member rename | PATCH `/{env_id}` | User not workspace member | 403, `forbidden` | P2 |
| **S3** | Non-member delete | DELETE `/{env_id}` | User not workspace member | 403, `forbidden` | P2 |
| **S4** | Cross-workspace access (missing env) | PATCH/DELETE `/{env_id}` | Env from different workspace | 404, `not_found` (non-disclosing) | P2 |

### UI Integration

| # | Scenario | Surface | Expected | Priority |
|---|----------|---------|----------|----------|
| **U1** | UI — list environments section visible | Settings → Environments | Shows list (empty or populated) | P1 |
| **U2** | UI — create form submits to API | Click "Add Environment" → enter "Staging" | POST fires, env appears in list | P1 |
| **U3** | UI — rename inline editable | Click env → edit name → save | PATCH fires, name updates | P1 |
| **U4** | UI — delete button / confirmation | Click delete → confirm | DELETE fires, env removed from list | P1 |
| **U5** | UI — validation error (empty name) | Create form, submit empty | Toast/inline error shown (422 message) | P1 |
| **U6** | UI — duplicate error (exists already) | Create form, submit "Staging" (exists) | Toast/inline error shown (409 message) | P1 |
| **U7** | UI — in-use error (can't delete) | Delete button on env with runs | Toast/inline error shown (409 + run count) | P2 |

---

## Test Scope

- **API**: All happy path + validation + conflict + auth (curl/Postman)
- **UI**: Create, rename, delete, error states (staging web)
- **Database**: RLS isolation, case-insensitive uniqueness, FK guard on delete
- **RLS**: Verify non-member cannot list/write (optional, via DB direct query)

---

## Known Unknowns / Questions

1. **Delete-guard race condition** (noted in code):  
   Pre-count + row lock narrow but don't eliminate TOCTOU window. FK backstop (23503) is load-bearing. Test can't easily trigger this; accept as design tradeoff.

2. **UI error handling**:  
   - Does UI parse 409 `conflict` + `run_count` detail and render custom message?  
   - Or does it just show the generic `message` from error envelope?
   - Check stage 2 execution.

3. **UI form state**:  
   - On validation error (422), does form keep user input or clear?
   - Expected: keep input for user to fix.

---

## Test Execution Plan

**Stage 2**: Execute all P0 + P1 TCs in order (H1-H6, V1-V5, C1-C3, U1-U6).

**Execution method**:
- API tests: Postman (scripted requests + assertions)
- UI tests: Manual browser navigation (staging)

---

## Exit Criteria (Stage 1 → Stage 2)

- [x] ATP designed
- [x] Error codes mapped
- [x] Validation rules documented
- [x] RLS understood
- [ ] Any dev questions answered (waiting on 3 unknowns above)

**Blockers**: None. Proceed to Stage 2.
