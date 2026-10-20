# Measured Gotchas

> Loaded by: `business-api-context`, when reading this project's api map could mislead a competent session. Every row was measured on the date given against the source it names. Rows that stop being true move to §"No longer true"; they are never deleted. Proposed and applied per `agentic-qa-core/references/skill-refinement-protocol.md`.

## 1 · Reading the map

| # | Gotcha | Symptom | Fix | Measured | Verified against |
|---|---|---|---|---|---|
| 1 | `Idempotency-Key` is required on only four writes | `POST /api/v1/runs`, `POST /api/v1/tests`, `POST /api/v1/test-plans/{id}/tests` or `POST /api/v1/workspaces/{id}/billing/checkout` answers 400 `idempotency_key_required`, while mark, finish, abort and signup accept the same call without it | Send an 8 to 128 character `[a-zA-Z0-9_-]` key on those four routes; do not expect replay protection anywhere else. Find the list with `git grep -n "beginIdempotentRequest(" -- app/api`, not from memory | 2026-10-19 | `lib/api/idempotency.ts` (`readKey`) and the four route files on `origin/staging` |
| 2 | The Stripe webhook is not in the contract | `POST /api/v1/billing/webhook` is absent from `public/openapi.json` and the Scalar docs | Read the route file for its behaviour; it authenticates only by the `stripe-signature` header | 2026-10-19 | `public/openapi.json` vs `app/api/v1/billing/webhook/route.ts` on `origin/staging` |
| 3 | RLS does not protect service-role routes | A cross-workspace probe straight against the database looks safe, yet the route can still leak | Probe isolation through the route: about half the route files use the service-role client and rely on the `bunkai_*` function's own membership check (incidents fixed in 0047 and 0089) | 2026-10-19 | `git grep createAdminClient -- app/api` on `origin/staging` (49 of 88 route files) |

## 2 · No longer true

_(empty)_
