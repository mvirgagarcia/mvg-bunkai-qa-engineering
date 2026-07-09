import { test } from '@TestFixture';

const projectId = process.env.TEST_PROJECT_ID || 'test-proj-bk148';

test.describe('BK-148: Project Environments CRUD', () => {
  // Scenario 1: RLS Isolation
  test('BK-148: TC#1 should validate list is scoped to workspace', async ({ ui }) => {
    await ui.projectEnvironments.validateListIsScoped(projectId, ['Staging', 'QA', 'Prod']);
  });

  test('BK-148: TC#2 should block cross-workspace mutation', async ({ ui }) => {
    await ui.projectEnvironments.validateCrossWorkspaceMutationBlocked('other-env-id-from-different-ws');
  });

  test('BK-148: TC#3 should block viewer role mutation', async ({ ui }) => {
    await ui.projectEnvironments.validateViewerRoleCannotMutate(projectId);
  });

  // Scenario 2: Uniqueness
  test('BK-148: TC#4 should create new environment', async ({ ui }) => {
    await ui.projectEnvironments.validateCreateNewEnvironmentSucceeds(projectId, 'Test-Dev');
  });

  test('BK-148: TC#5 should reject duplicate name', async ({ ui }) => {
    await ui.projectEnvironments.validateCreateDuplicateRejected(projectId, 'Staging');
  });

  test('BK-148: TC#6 should allow same name in different project', async ({ ui }) => {
    await ui.projectEnvironments.validateCrossProjectDuplicationAllowed(projectId, 'other-proj-id', 'Common-Name');
  });

  test('BK-148: TC#7 should trim whitespace', async ({ ui }) => {
    await ui.projectEnvironments.validateWhitespaceTrimmed(projectId, '  Trimmed-Test  ', 'Trimmed-Test');
  });

  test('BK-148: TC#8 should reject empty name', async ({ ui }) => {
    await ui.projectEnvironments.validateEmptyNameRejected(projectId);
  });

  test('BK-148: TC#9 should reject name >50 chars', async ({ ui }) => {
    await ui.projectEnvironments.validateNameLengthLimit(projectId);
  });

  test('BK-148: TC#10 should rename environment', async ({ ui }) => {
    await ui.projectEnvironments.validateRenameSucceeds(projectId, 'Old-Name', 'New-Name');
  });

  test('BK-148: TC#11 should reject duplicate on rename', async ({ ui }) => {
    await ui.projectEnvironments.validateRenameDuplicateRejected(projectId, 'Staging');
  });

  test('BK-148: TC#12 should allow same name in different project on rename', async ({ ui }) => {
    await ui.projectEnvironments.validateRenameCrossProjectAllowed(projectId, 'other-proj-id', 'Common-Rename');
  });

  test('BK-148: TC#13 should trim whitespace on rename', async ({ ui }) => {
    await ui.projectEnvironments.validateRenameWhitespaceTrimmed(projectId, 'Old', '  New  ', 'New');
  });

  test('BK-148: TC#14 should allow idempotent rename', async ({ ui }) => {
    await ui.projectEnvironments.validateRenameIdempotent(projectId, 'Staging');
  });

  // Scenario 3: Delete Guard
  test('BK-148: TC#15 should delete without runs', async ({ ui }) => {
    await ui.projectEnvironments.validateDeleteSucceedsWithoutRuns(projectId, 'No-Runs-Env');
  });

  test('BK-148: TC#16 should block delete with active run', async ({ ui }) => {
    await ui.projectEnvironments.validateDeleteBlockedWithActiveRun(projectId, 'Staging');
  });

  test('BK-148: TC#17 should block delete with multiple active runs', async ({ ui }) => {
    await ui.projectEnvironments.validateDeleteBlockedWithMultipleActiveRuns(projectId, 'Prod');
  });

  test('BK-148: TC#18 should allow delete with completed runs', async ({ ui }) => {
    await ui.projectEnvironments.validateDeleteSucceedsWithCompletedRuns(projectId, 'Completed-Runs-Env');
  });

  // Scenario 4: Happy Path
  test('BK-148: TC#19 should load page in <2 sec', async ({ ui }) => {
    await ui.projectEnvironments.validatePageLoadTime(projectId);
  });

  test('BK-148: TC#20 should create via UI', async ({ ui }) => {
    await ui.projectEnvironments.validateCreateViaUI(projectId, 'UI-Create-Test');
  });

  test('BK-148: TC#21 should rename via UI', async ({ ui }) => {
    await ui.projectEnvironments.validateRenameViaUI(projectId, 'Rename-From', 'Rename-To');
  });

  test('BK-148: TC#22 should delete via UI', async ({ ui }) => {
    await ui.projectEnvironments.validateDeleteViaUI(projectId, 'Delete-Test');
  });

  test('BK-148: TC#23 should show validation error toast', async ({ ui }) => {
    await ui.projectEnvironments.validateValidationErrorToastDisplays(projectId);
  });

  test('BK-148: TC#24 should show conflict error toast', async ({ ui }) => {
    await ui.projectEnvironments.validateConflictErrorToastDisplays(projectId, 'Staging');
  });

  test('BK-148: TC#25 should show in-use error toast', async ({ ui }) => {
    await ui.projectEnvironments.validateInUseErrorToastDisplays(projectId, 'Staging');
  });
});
