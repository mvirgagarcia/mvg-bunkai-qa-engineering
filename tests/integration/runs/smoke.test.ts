/**
 * KATA Architecture - Runs Smoke (Integration)
 *
 * Daily @critical health check of the Runs domain through the API, READ-ONLY.
 * Staging is one shared database and a Run can never be deleted, so this smoke
 * never starts a Run: it proves the PAT reaches the user's workspace and that
 * the project run report answers with its pass/fail totals.
 *
 * Project: integration (depends on api-setup)
 */

import { expect, test } from '@TestFixture';

test.describe('Runs: read-only smoke', { tag: ['@critical'] }, () => {
  test('should read the run report of a project in the active workspace', async ({ api }) => {
    // The PAT from api-state.json authenticates and resolves a workspace
    const [meResponse, me] = await api.auth.getCurrentUser();
    expect(meResponse.status()).toBe(200);
    const workspaceId = me.active_workspace_id ?? me.workspaces[0]?.id;
    expect(workspaceId, 'the test user must belong to at least one workspace').toBeTruthy();

    // A project of that workspace (most recently active first)
    const [recentResponse, { projects }] = await api.apiGET<{ projects: Array<{ id: string }> }>(
      `/v1/workspaces/${workspaceId}/recent-projects`,
      { params: { limit: '1' } },
    );
    expect(recentResponse.status()).toBe(200);
    expect(projects.length, 'the test user\'s workspace must hold at least one project').toBeGreaterThan(0);

    // The domain read: the project's runs with pass/fail totals
    const [reportResponse, report] = await api.runs.getProjectRunReport(projects[0].id, { limit: '5' });
    expect(reportResponse.status()).toBe(200);
    expect(Array.isArray(report.items)).toBe(true);
    expect(report.totals.passed).toBeGreaterThanOrEqual(0);
    expect(report.totals.failed).toBeGreaterThanOrEqual(0);
  });
});
