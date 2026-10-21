/**
 * KATA Architecture - User Session Integration Tests
 *
 * Tests for authenticated user session via API.
 * Validates that token propagation works correctly.
 *
 * Project: integration (depends on api-setup)
 */

import { config, expect, test } from '@TestFixture';

test.describe('Auth: User Session API', { tag: ['@critical'] }, () => {
  /**
   * Validates that the auth token (a PAT) is automatically loaded from
   * api-state.json and can be used to make authenticated API calls.
   */
  test('should get current user with valid token', async ({ api }) => {
    // The token is automatically loaded from api-state.json by ApiFixture
    // Use helper (not ATC) — this is a read-only verification
    const [response, userData] = await api.auth.getCurrentUser();

    // Test-level assertions (Bunkai /v1/me shape)
    expect(response.status()).toBe(200);
    expect(userData.user.id).toBeTruthy();
    expect(userData.user.email?.toLowerCase()).toBe(config.testUser.email.toLowerCase());
    expect(userData.auth.source).toBe('bearer');
    expect(userData.workspaces.length).toBeGreaterThan(0);
  });

  /**
   * Validates that unauthenticated requests are rejected.
   * Uses the helper directly with token cleared.
   */
  test('should fail without token', async ({ api }) => {
    // Temporarily clear token to test unauthorized access
    api.clearAuthToken();

    const [response] = await api.auth.getCurrentUser();

    // Test-level assertions — no session should exist
    expect(response.status()).toBe(401);
    expect(response.ok()).toBe(false);
  });

  /**
   * Validates that we can re-authenticate and get a new token.
   * This tests the runtime token refresh capability.
   */
  test('should be able to re-authenticate', async ({ api }) => {
    // Clear existing token
    api.clearAuthToken();

    // Re-authenticate using the ATC; the minted PAT expires in a day
    const credentials = {
      email: config.testUser.email,
      password: config.testUser.password,
      pat_name: 'kata-reauth-test',
      pat_expires_in_days: config.auth.patExpiresInDays,
    };

    const [response, tokenData] = await api.auth.authenticateSuccessfully(credentials);

    // Verify a new PAT was obtained and set
    expect(response.status()).toBe(200);
    expect(tokenData.pat.token).toMatch(/^bk_pat_/);
  });
});
