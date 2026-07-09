# Comments for BK-22

[View in Jira](https://upexgalaxy67.atlassian.net/browse/BK-22)

---

### Ely - 5/19/2026, 9:57:34 PM

# 🧱 Architect Annotation

## Technical Notes
- DB tables touched: READ-ONLY against `test*steps` and `tests`. Existing index `test*steps(atc_id)` is required for performant queries (verify in BK-20/BK-21 — likely already added).
- API surface: `GET /atcs/{id}/usage` returns 200 `{ used*in: [...] }`. Returns 404 with error code `atc*not_found` when the ATC belongs to a different workspace (avoids existence leak).
- Query shape: `SELECT ts.test*id, t.slug, t.title, ts.position AS position*in*test FROM test*steps ts JOIN tests t ON t.id = ts.test*id WHERE ts.atc*id = $1 AND t.workspace*id = $session.workspace*id ORDER BY t.slug ASC, ts.position ASC`.
- Multi-position entries: when the same Test references the ATC at multiple positions, the JOIN naturally returns multiple rows. No deduplication.
- Workspace scoping enforced at service layer via WHERE clause. The ATC existence check (`SELECT 1 FROM atcs WHERE id = $1 AND workspace*id = $session.workspace*id`) runs first to decide 404 vs 200.
- No caching in MVP — the query is cheap (indexed FK lookup) and the response is small. Add cache only if profiling shows hot endpoint.

## Dependencies
- Upstream: BK-18 (atcs table exists). EPIC-BK-5 must define `test*steps` and `tests` tables with `atc*id`, `position`, and `slug` columns. Without `test*steps` this endpoint returns empty `used*in[]` always.
- Downstream: ATC detail page UI renders "Used in N tests" widget and deep links to each Test. Delete-ATC flow (future story) will call this endpoint to display a confirmation modal with the impact list.
- External: PostgreSQL only.

## Definition of Done (expanded)
- [ ] OpenAPI entry for `GET /atcs/{id}/usage` with response schema
- [ ] `bun run api:sync` passes
- [ ] Unit tests: empty result, single Test single position, single Test multi-position, multi-Test ordering by slug
- [ ] Integration test: workspace scoping returns 404 (not 403) for cross-workspace lookup
- [ ] Performance budget: < 50ms p95 on ATCs referenced in ≤ 100 Tests
- [ ] Lint + typecheck pass
- [ ] Manual smoke: curl returns expected shape on an ATC with known usage
- [ ] PR description references each AC by Gherkin scenario name

## Related Documentation
- PRD: `.context/PRD/mvp-scope.md` § EPIC-BK-004 (US 4.5)
- SRS: `.context/SRS/functional-specs.md` § FR-013
- Business map: `.context/business/business-data-map.md` § test_steps (FK to atcs.id)
- API contract: `.context/SRS/api-contracts.yaml` § paths./atcs/{id}/usage


---

### Ely - 5/20/2026, 5:24:49 AM

# 🧱 Architect Annotation (rich-format test)

## Technical Notes

- DB tables: `atcs`, `test_steps` (join), `tests`
- API: `GET /atcs/{id}/usage` returns `{ used*in: [{ test*id, slug, title, position*in*test }] }`
- Pure read endpoint — caller role ≥ viewer

## Dependencies

- Upstream: ***BK-18*** (ATC API) creates the atcs table this query reads from
- Upstream: ***BK-21*** (edit propagation) emits `atc.updated` with `affected*test*ids` — this widget hydrates from that payload optimistically
- Downstream: powers the **impact preview** in BK-21's edit UI

## Definition of Done

1. Query returns `position*in*test` correctly when the same ATC appears multiple times in one Test
2. Empty result returns `{ used_in: [] }` not 404
3. Performance: index on `test*steps(atc*id)` exists; benchmark <50ms p95 with 10k Tests in fixture

## Related

- PRD: `.context/PRD/mvp-scope.md` § EPIC-BK-004 US 4.5
- SRS: `.context/SRS/functional-specs.md` § FR-013

```sql
-- The query this story implements
SELECT t.id, t.slug, t.title, ts.position
FROM test_steps ts
JOIN tests t ON t.id = ts.test_id
WHERE ts.atc_id = $1
ORDER BY t.created_at;
```

> Note: this is a comment ADF rich-format round-trip test. Snake*case identifiers like `atc*id` and `test_steps` must survive unchanged.

---


_Synced from Jira by sync-jira-issues_
_Last sync: 2026-06-01T22:14:49.931Z_
