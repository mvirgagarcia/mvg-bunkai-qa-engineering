/**
 * KATA Architecture - UI Auth Setup
 *
 * Authenticates via the login page UI and intercepts the JWT token
 * using page.waitForResponse() - single authentication, no separate API call.
 *
 * This provides BOTH:
 * - Browser session (storageState) for UI tests
 * - API token (intercepted) for API calls within E2E tests
 *
 * Dependencies: global-setup
 * Dependents: e2e
 */

import type { ApiState } from '@data/types';
import type { TokenResponse } from '@schemas/auth.types';

import { writeFileSync } from 'node:fs';
import { test as setup } from '@TestFixture';
import { attachRequestResponseToAllure } from '@utils/allure';
import { config } from '@variables';

const storageStateFile = config.auth.storageStatePath;
const apiStateFile = config.auth.apiStatePath;

/**
 * UI Authentication Setup
 *
 * Uses direct API call to /api/v1/auth/signin (headless auth)
 * instead of UI magic-link flow for speed + reliability.
 *
 * 1. POSTs credentials to /api/v1/auth/signin
 * 2. Captures JWT token + PAT from response
 * 3. Saves cookies for UI tests
 * 4. Saves api-state (token) for API integration
 */
setup('UI Setup: authenticate via UI', async ({ page }) => {
  console.log('[UI Setup] Starting API authentication...');
  console.log('[UI Setup] Target: /api/v1/auth/signin');

  // Credentials for login
  const credentials = {
    email: config.testUser.email,
    password: config.testUser.password,
  };

  // Direct API call (faster than UI magic-link flow)
  // Use config.baseUrl/v1 to ensure full URL (not relative path)
  const apiSigninUrl = `${config.baseUrl}/api/v1/auth/signin`;
  const response = await page.request.post(apiSigninUrl, {
    data: credentials,
  });

  if (!response.ok()) {
    const errorBody = await response.text();
    throw new Error(`Auth failed (${response.status()}): ${errorBody}`);
  }

  const tokenData = (await response.json()) as TokenResponse;

  // Attach to Allure for debugging
  await attachRequestResponseToAllure({
    url: response.url(),
    method: 'POST',
    responseBody: tokenData,
    requestBody: { email: credentials.email, password: '***' },
  });

  // Verify token was obtained
  if (!tokenData?.access_token) {
    throw new Error('Token response missing access_token');
  }

  console.log('[UI Setup] API authentication successful');

  // Save storage state (cookies + localStorage) for UI tests
  await page.context().storageState({ path: storageStateFile });
  console.log(`[UI Setup] Storage state saved to ${storageStateFile}`);

  // Save the token for API calls within E2E tests
  const apiState: ApiState = {
    token: tokenData.access_token,
    tokenType: tokenData.token_type || 'Bearer',
    expiresIn: tokenData.expires_in,
    refreshToken: tokenData.refresh_token || null,
    source: 'ui-login',
    createdAt: new Date().toISOString(),
  };

  writeFileSync(apiStateFile, JSON.stringify(apiState, null, 2));
  console.log(`[UI Setup] API token (PAT) saved to ${apiStateFile}`);

  console.log('[UI Setup] Authentication successful');
  console.log(`[UI Setup] Session established for ${credentials.email}`);
});
