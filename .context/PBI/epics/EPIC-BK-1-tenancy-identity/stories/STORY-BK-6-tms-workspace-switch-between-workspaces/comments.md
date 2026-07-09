# Comments for BK-6

[View in Jira](https://upexgalaxy67.atlassian.net/browse/BK-6)

---

### Ely - 5/19/2026, 9:05:45 PM

🧱 ***Architect Annotation***

*Posted by repo automation. Sections below are the architecture-grade complement to the user-facing fields (description / AC / Scope / Business Rules / Workflow). Source-of-truth on dev-side concerns — synced to local `comments.md` by `sync-jira-issues`.*

## Technical Notes
### Frontend

- Component: `<WorkspaceSwitcher />` in `app/layout.tsx` header.
- Hook: `useActiveWorkspace()` consuming `AuthContext`.

### Backend

- Routes:
  - `GET app/api/v1/me/workspaces/route.ts`
  - `POST app/api/v1/me/active-workspace/route.ts`
- Middleware updated to read `active*workspace*id` from session on every request.

### Database

- Tables: `workspace_members` (status field).
- Session: stored in Supabase cookie + read by `lib/supabase/server.ts`.

## Dependencies
### Blocked By

- BK-4 (workspace creation) — need ≥2 workspaces to switch between.

### Blocks

- API middleware tenancy scoping (relied upon by every subsequent epic).

## Definition of Done
- [ ] All 4 AC scenarios pass on staging.
- [ ] API middleware verified — every protected route reads active*workspace*id.
- [ ] UI switcher renders correctly when user has 1, 2, and 10+ workspaces.
- [ ] Suspended-membership path returns 403 (not 404 / not silent success).

---

### Ely - 5/27/2026, 8:50:24 PM

Implementado este sprint.

Code on main:
- f0d36d0 feat(workspaces): active-workspace switch via cookie + /me introspection (bk-6)

Surfaces ready for QA:
- GET /api/v1/me — returns user + workspaces[] + active*workspace*id (resolved from bk*active*ws cookie; falls back to oldest workspace).
- POST /api/v1/me/active-workspace — membership-validated workspace selection; sets httpOnly cookie bk*active*ws (sameSite=lax, 90d).
- WorkspaceSwitcher (Topbar dropdown) fetches /api/v1/me lazily, calls switch endpoint on selection, router.refresh on success. Footer link to members page.

Cross-tenant guard: RLS continues to filter every query; switching the cookie does not grant access — only narrows the active scope in the UI. Verify by signing in as a second user and querying the first user's workspace_id directly — expect 0 rows.

Testability guide: /qa + Jira Epic BK-29.

---


_Synced from Jira by sync-jira-issues_
_Last sync: 2026-06-01T22:14:40.042Z_
