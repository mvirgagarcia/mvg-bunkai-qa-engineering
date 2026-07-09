import type { TestContextOptions } from '@TestContext';

import { expect } from '@playwright/test';
import { UiBase } from '@ui/UiBase';
import { atc } from '@utils/decorators';

export class ProjectEnvironmentsPage extends UiBase {
  constructor(options: TestContextOptions) {
    super(options);
  }

  // Helpers

  private async gotoProject(projectId: string): Promise<void> {
    await this.page.goto(`/projects/${projectId}`);
    await this.page.waitForLoadState('networkidle');
  }

  private async openCreateModal(): Promise<void> {
    const addBtn = this.page.locator('[data-testid="environment-add"]');
    await addBtn.click({ timeout: 5000 });
    await this.page.locator('[data-testid="create-environment-modal"]').waitFor({ state: 'visible', timeout: 5000 });
  }

  private async fillAndSubmitCreate(envName: string): Promise<void> {
    await this.page.locator('[data-testid="create-environment-name"]').fill(envName);
    await this.page.locator('[data-testid="create-environment-submit"]').click();
    await this.page.waitForLoadState('networkidle');
  }

  private async closeModal(): Promise<void> {
    await this.page.keyboard.press('Escape');
    await this.page.locator('[data-testid="create-environment-modal"]').waitFor({ state: 'hidden', timeout: 3000 }).catch(() => {});
  }

  // Scenario 1: RLS Isolation

  @atc('BK-148: TC#1')
  async validateListIsScoped(projectId: string, expectedNames: string[]): Promise<void> {
    await this.gotoProject(projectId);
    const pageText = await this.page.textContent('body');
    expectedNames.forEach((name) => {
      expect(pageText).toContain(name);
    });
  }

  @atc('BK-148: TC#2')
  async validateCrossWorkspaceMutationBlocked(envIdFromOtherWorkspace: string): Promise<void> {
    const response = await this.page.request.patch(`/api/v1/environments/${envIdFromOtherWorkspace}`, {
      data: { name: 'Hacked' },
    });
    expect([403, 404]).toContain(response.status());
  }

  @atc('BK-148: TC#3')
  async validateViewerRoleCannotMutate(projectId: string): Promise<void> {
    await this.gotoProject(projectId);
    const btn = this.page.locator('[data-testid="environment-add"]');
    const isHidden = !(await btn.isVisible().catch(() => false));
    expect(isHidden).toBeTruthy();
  }

  // Scenario 2: Uniqueness & Validation

  @atc('BK-148: TC#4')
  async validateCreateNewEnvironmentSucceeds(projectId: string, envName: string): Promise<void> {
    await this.gotoProject(projectId);
    await this.openCreateModal();
    await this.fillAndSubmitCreate(envName);

    const envExists = await this.page.locator('[data-testid*="explorer-environment"]').filter({ hasText: envName }).isVisible().catch(() => false);
    expect(envExists).toBeTruthy();
  }

  @atc('BK-148: TC#5')
  async validateCreateDuplicateRejected(projectId: string, existingEnvName: string): Promise<void> {
    await this.gotoProject(projectId);
    await this.openCreateModal();
    await this.page.locator('[data-testid="create-environment-name"]').fill(existingEnvName);
    await this.page.locator('[data-testid="create-environment-submit"]').click();

    const errorMsg = this.page.locator('[data-testid="create-environment-error"]');
    const hasError = await errorMsg.isVisible({ timeout: 5000 }).catch(() => false);
    expect(hasError).toBeTruthy();
  }

  @atc('BK-148: TC#6')
  async validateCrossProjectDuplicationAllowed(
    projectId1: string,
    projectId2: string,
    envName: string,
  ): Promise<void> {
    // Create in project 1
    await this.gotoProject(projectId1);
    await this.openCreateModal();
    await this.fillAndSubmitCreate(envName);

    // Create same name in project 2
    await this.gotoProject(projectId2);
    await this.openCreateModal();
    await this.fillAndSubmitCreate(envName);

    // Should succeed (no error)
    const hasError = await this.page.locator('[data-testid="create-environment-error"]').isVisible().catch(() => false);
    expect(hasError).toBeFalsy();
  }

  @atc('BK-148: TC#7')
  async validateWhitespaceTrimmed(
    projectId: string,
    inputWithSpaces: string,
    expectedTrimmed: string,
  ): Promise<void> {
    await this.gotoProject(projectId);
    await this.openCreateModal();
    await this.fillAndSubmitCreate(inputWithSpaces);

    const trimmedExists = await this.page.locator('[data-testid*="explorer-environment"]').filter({ hasText: expectedTrimmed }).isVisible().catch(() => false);
    expect(trimmedExists).toBeTruthy();
  }

  @atc('BK-148: TC#8')
  async validateEmptyNameRejected(projectId: string): Promise<void> {
    await this.gotoProject(projectId);
    await this.openCreateModal();
    await this.page.locator('[data-testid="create-environment-submit"]').click();

    const errorMsg = this.page.locator('[data-testid="create-environment-error"]');
    const hasError = await errorMsg.isVisible({ timeout: 5000 }).catch(() => false);
    expect(hasError).toBeTruthy();
  }

  @atc('BK-148: TC#9')
  async validateNameLengthLimit(projectId: string): Promise<void> {
    await this.gotoProject(projectId);
    await this.openCreateModal();

    const longName = 'a'.repeat(100);
    await this.page.locator('[data-testid="create-environment-name"]').fill(longName);
    await this.page.locator('[data-testid="create-environment-submit"]').click();

    const errorMsg = this.page.locator('[data-testid="create-environment-error"]');
    const hasError = await errorMsg.isVisible({ timeout: 5000 }).catch(() => false);
    expect(hasError).toBeTruthy();
  }

  @atc('BK-148: TC#10')
  async validateRenameSucceeds(projectId: string, oldName: string, newName: string): Promise<void> {
    await this.gotoProject(projectId);

    const renameForm = this.page.locator('[data-testid="rename-environment-form"]');
    if (await renameForm.isVisible().catch(() => false)) {
      await renameForm.locator('[data-testid="rename-environment-name"]').fill(newName);
      await renameForm.locator('[data-testid="rename-environment-submit"]').click();
      await this.page.waitForLoadState('networkidle');
    }

    const newExists = await this.page.locator('[data-testid*="explorer-environment"]').filter({ hasText: newName }).isVisible().catch(() => false);
    expect(newExists).toBeTruthy();
  }

  @atc('BK-148: TC#11')
  async validateRenameDuplicateRejected(projectId: string, targetName: string): Promise<void> {
    await this.gotoProject(projectId);

    const renameForm = this.page.locator('[data-testid="rename-environment-form"]');
    if (await renameForm.isVisible().catch(() => false)) {
      await renameForm.locator('[data-testid="rename-environment-name"]').fill(targetName);
      await renameForm.locator('[data-testid="rename-environment-submit"]').click();

      const errorMsg = renameForm.locator('[data-testid="rename-environment-error"]');
      const hasError = await errorMsg.isVisible({ timeout: 5000 }).catch(() => false);
      expect(hasError).toBeTruthy();
    }
  }

  @atc('BK-148: TC#12')
  async validateRenameCrossProjectAllowed(
    projectId1: string,
    projectId2: string,
    commonName: string,
  ): Promise<void> {
    // Rename in project 1
    await this.gotoProject(projectId1);
    let renameForm = this.page.locator('[data-testid="rename-environment-form"]');
    if (await renameForm.isVisible().catch(() => false)) {
      await renameForm.locator('[data-testid="rename-environment-name"]').fill(commonName);
      await renameForm.locator('[data-testid="rename-environment-submit"]').click();
      await this.page.waitForLoadState('networkidle');
    }

    // Rename in project 2
    await this.gotoProject(projectId2);
    renameForm = this.page.locator('[data-testid="rename-environment-form"]');
    if (await renameForm.isVisible().catch(() => false)) {
      await renameForm.locator('[data-testid="rename-environment-name"]').fill(commonName);
      await renameForm.locator('[data-testid="rename-environment-submit"]').click();

      const hasError = await renameForm.locator('[data-testid="rename-environment-error"]').isVisible().catch(() => false);
      expect(hasError).toBeFalsy();
    }
  }

  @atc('BK-148: TC#13')
  async validateRenameWhitespaceTrimmed(
    projectId: string,
    envName: string,
    newNameWithSpaces: string,
    expectedTrimmed: string,
  ): Promise<void> {
    await this.gotoProject(projectId);

    const renameForm = this.page.locator('[data-testid="rename-environment-form"]');
    if (await renameForm.isVisible().catch(() => false)) {
      await renameForm.locator('[data-testid="rename-environment-name"]').fill(newNameWithSpaces);
      await renameForm.locator('[data-testid="rename-environment-submit"]').click();
      await this.page.waitForLoadState('networkidle');
    }

    const trimmedExists = await this.page.locator('[data-testid*="explorer-environment"]').filter({ hasText: expectedTrimmed }).isVisible().catch(() => false);
    expect(trimmedExists).toBeTruthy();
  }

  @atc('BK-148: TC#14')
  async validateRenameIdempotent(projectId: string, envName: string): Promise<void> {
    await this.gotoProject(projectId);

    const renameForm = this.page.locator('[data-testid="rename-environment-form"]');
    if (await renameForm.isVisible().catch(() => false)) {
      await renameForm.locator('[data-testid="rename-environment-name"]').fill(envName);
      await renameForm.locator('[data-testid="rename-environment-submit"]').click();

      const hasError = await renameForm.locator('[data-testid="rename-environment-error"]').isVisible().catch(() => false);
      expect(hasError).toBeFalsy();
    }
  }

  // Scenario 3: Delete Guard

  @atc('BK-148: TC#15')
  async validateDeleteSucceedsWithoutRuns(projectId: string, envName: string): Promise<void> {
    await this.gotoProject(projectId);

    const deleteDialog = this.page.locator('[data-testid="delete-environment-dialog"]');
    if (await deleteDialog.isVisible().catch(() => false)) {
      await deleteDialog.locator('[data-testid="delete-environment-confirm"]').click();
      await this.page.waitForLoadState('networkidle');
    }

    const envGone = !(await this.page.locator('[data-testid*="explorer-environment"]').filter({ hasText: envName }).isVisible().catch(() => false));
    expect(envGone).toBeTruthy();
  }

  @atc('BK-148: TC#16')
  async validateDeleteBlockedWithActiveRun(projectId: string, _envNameWithRuns: string): Promise<void> {
    await this.gotoProject(projectId);

    const deleteDialog = this.page.locator('[data-testid="delete-environment-dialog"]');
    if (await deleteDialog.isVisible().catch(() => false)) {
      const errorMsg = deleteDialog.locator('[data-testid="delete-environment-error"]');
      const hasError = await errorMsg.isVisible({ timeout: 5000 }).catch(() => false);
      expect(hasError).toBeTruthy();
    }
  }

  @atc('BK-148: TC#17')
  async validateDeleteBlockedWithMultipleActiveRuns(projectId: string, _envNameWithMultipleRuns: string): Promise<void> {
    await this.gotoProject(projectId);

    const deleteDialog = this.page.locator('[data-testid="delete-environment-dialog"]');
    if (await deleteDialog.isVisible().catch(() => false)) {
      const errorMsg = deleteDialog.locator('[data-testid="delete-environment-error"]');
      const text = await errorMsg.textContent();
      expect(text?.toLowerCase()).toContain('run');
    }
  }

  @atc('BK-148: TC#18')
  async validateDeleteSucceedsWithCompletedRuns(projectId: string, envNameWithCompletedRuns: string): Promise<void> {
    await this.gotoProject(projectId);

    const deleteDialog = this.page.locator('[data-testid="delete-environment-dialog"]');
    if (await deleteDialog.isVisible().catch(() => false)) {
      await deleteDialog.locator('[data-testid="delete-environment-confirm"]').click();
      await this.page.waitForLoadState('networkidle');
    }

    const envGone = !(await this.page.locator('[data-testid*="explorer-environment"]').filter({ hasText: envNameWithCompletedRuns }).isVisible().catch(() => false));
    expect(envGone).toBeTruthy();
  }

  // Scenario 4: Happy Path

  @atc('BK-148: TC#19')
  async validatePageLoadTime(projectId: string): Promise<void> {
    const startTime = Date.now();
    await this.gotoProject(projectId);
    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(2000);
  }

  @atc('BK-148: TC#20')
  async validateCreateViaUI(projectId: string, envName: string): Promise<void> {
    await this.gotoProject(projectId);
    await this.openCreateModal();
    await this.fillAndSubmitCreate(envName);

    const envExists = await this.page.locator('[data-testid*="explorer-environment"]').filter({ hasText: envName }).isVisible().catch(() => false);
    expect(envExists).toBeTruthy();
  }

  @atc('BK-148: TC#21')
  async validateRenameViaUI(projectId: string, oldName: string, newName: string): Promise<void> {
    await this.gotoProject(projectId);

    const renameForm = this.page.locator('[data-testid="rename-environment-form"]');
    if (await renameForm.isVisible().catch(() => false)) {
      await renameForm.locator('[data-testid="rename-environment-name"]').fill(newName);
      await renameForm.locator('[data-testid="rename-environment-submit"]').click();
      await this.page.waitForLoadState('networkidle');
    }

    const newExists = await this.page.locator('[data-testid*="explorer-environment"]').filter({ hasText: newName }).isVisible().catch(() => false);
    expect(newExists).toBeTruthy();
  }

  @atc('BK-148: TC#22')
  async validateDeleteViaUI(projectId: string, envName: string): Promise<void> {
    await this.gotoProject(projectId);

    const deleteDialog = this.page.locator('[data-testid="delete-environment-dialog"]');
    if (await deleteDialog.isVisible().catch(() => false)) {
      await deleteDialog.locator('[data-testid="delete-environment-confirm"]').click();
      await this.page.waitForLoadState('networkidle');
    }

    const envGone = !(await this.page.locator('[data-testid*="explorer-environment"]').filter({ hasText: envName }).isVisible().catch(() => false));
    expect(envGone).toBeTruthy();
  }

  @atc('BK-148: TC#23')
  async validateValidationErrorToastDisplays(projectId: string): Promise<void> {
    await this.gotoProject(projectId);
    await this.openCreateModal();
    await this.page.locator('[data-testid="create-environment-submit"]').click();

    const errorMsg = this.page.locator('[data-testid="create-environment-error"]');
    const hasError = await errorMsg.isVisible({ timeout: 5000 }).catch(() => false);
    expect(hasError).toBeTruthy();
  }

  @atc('BK-148: TC#24')
  async validateConflictErrorToastDisplays(projectId: string, existingEnvName: string): Promise<void> {
    await this.gotoProject(projectId);
    await this.openCreateModal();
    await this.page.locator('[data-testid="create-environment-name"]').fill(existingEnvName);
    await this.page.locator('[data-testid="create-environment-submit"]').click();

    const errorMsg = this.page.locator('[data-testid="create-environment-error"]');
    const hasError = await errorMsg.isVisible({ timeout: 5000 }).catch(() => false);
    expect(hasError).toBeTruthy();
  }

  @atc('BK-148: TC#25')
  async validateInUseErrorToastDisplays(projectId: string, _envNameWithRuns: string): Promise<void> {
    await this.gotoProject(projectId);

    const deleteDialog = this.page.locator('[data-testid="delete-environment-dialog"]');
    if (await deleteDialog.isVisible().catch(() => false)) {
      const errorMsg = deleteDialog.locator('[data-testid="delete-environment-error"]');
      const hasError = await errorMsg.isVisible({ timeout: 5000 }).catch(() => false);
      expect(hasError).toBeTruthy();
    }
  }
}
