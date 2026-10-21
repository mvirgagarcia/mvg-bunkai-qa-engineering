/**
 * KATA Architecture - Dashboard E2E Test
 *
 * Simple validation test to verify the setup authentication works.
 * This test relies on ui-auth.setup.ts having signed in and saved the
 * browser session to .auth/user.json.
 *
 * If this test passes, it confirms:
 * 1. The ui-setup project ran successfully
 * 2. The signin set the session cookies
 * 3. Storage state was saved and loaded correctly
 * 4. The authenticated session is valid
 */

import { expect, test } from '@TestFixture';

test.describe('Home: Dashboard', { tag: ['@critical'] }, () => {
  /**
   * @critical - Validates Global Setup authentication
   *
   * This test verifies that the authenticated session from ui-setup
   * is correctly loaded and allows access to protected pages.
   */
  test('should load the home page with authenticated session', async ({ page }) => {
    // /home is protected: middleware.ts redirects to /login?next=... without a session
    // (and to /onboarding when the user has no workspace).
    await page.goto('/home');

    await expect(page).not.toHaveURL(/.*\/login.*/);
    await expect(page).toHaveURL(/\/(home|onboarding)/);
    await expect(page).toHaveTitle(/.+/);
  });

  /**
   * Validates that the test user info is accessible via API.
   * Uses the same session from the browser to verify API access.
   */
  test('should access user info via API with session token', async ({ test: fixture }) => {
    // Use helper (not ATC) — this is a read-only verification
    const [response, userInfo] = await fixture.api.auth.getCurrentUser();

    // Test-level assertions (Bunkai /v1/me shape)
    expect(response.ok()).toBe(true);
    expect(response.status()).toBe(200);
    expect(userInfo.user.email).toBeDefined();
    expect(userInfo.user.id).toBeDefined();
  });
});
