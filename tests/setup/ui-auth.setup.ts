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
 * Uses a direct API call to /api/v1/auth/signin (headless auth), the endpoint
 * the email-first login form posts to, for speed + reliability. The form itself
 * is covered by LoginPage ATCs.
 *
 * 1. POSTs credentials to /api/v1/auth/signin
 * 2. Captures the session cookies + the PAT from the response
 * 3. Saves cookies for UI tests
 * 4. Saves api-state (token) for API integration
 */
setup('UI Setup: authenticate via UI', async ({ page }) => {
  console.log('[UI Setup] Starting API authentication...');
  console.log(`[UI Setup] Target: ${config.apiUrl}${config.auth.loginEndpoint}`);

  // Credentials for login. Every signin mints a PAT row on the shared database:
  // name it and let it expire.
  const credentials = {
    email: config.testUser.email,
    password: config.testUser.password,
    pat_name: 'kata-ui-setup',
    pat_expires_in_days: config.auth.patExpiresInDays,
  };

  // Direct API call to the same endpoint the login form posts to (faster and
  // steadier than driving the form); the response sets the session cookies on
  // this browser context, which storageState() then saves.
  const apiSigninUrl = `${config.apiUrl}${config.auth.loginEndpoint}`;
  const response = await page.request.post(apiSigninUrl, {
    data: credentials,
  });

  if (!response.ok()) {
    const errorBody = await response.text();
    throw new Error(`Auth failed (${response.status()}): ${errorBody}`);
  }

  const tokenData = (await response.json()) as TokenResponse;
  const pat = tokenData?.pat;

  // Attach to Allure for debugging (no token, no password)
  await attachRequestResponseToAllure({
    url: response.url(),
    method: 'POST',
    responseBody: { user: tokenData?.user, pat: pat ? { id: pat.id, name: pat.name, scopes: pat.scopes, expires_at: pat.expires_at } : null },
    requestBody: { email: credentials.email, password: '***' },
  });

  // Verify the PAT was obtained (the Bearer /api/v1 accepts)
  if (!pat?.token) {
    throw new Error('Signin response missing pat.token');
  }

  console.log('[UI Setup] API authentication successful');

  // Save storage state (cookies + localStorage) for UI tests
  await page.context().storageState({ path: storageStateFile });
  console.log(`[UI Setup] Storage state saved to ${storageStateFile}`);

  // Save the token for API calls within E2E tests
  const apiState: ApiState = {
    token: pat.token,
    tokenType: 'Bearer',
    expiresIn: pat.expires_at
      ? Math.max(0, Math.round((Date.parse(pat.expires_at) - Date.now()) / 1000))
      : config.auth.tokenLifetimeSeconds,
    refreshToken: null,
    source: 'ui-login',
    createdAt: new Date().toISOString(),
  };

  writeFileSync(apiStateFile, JSON.stringify(apiState, null, 2));
  console.log(`[UI Setup] API token (PAT) saved to ${apiStateFile}`);

  console.log('[UI Setup] Authentication successful');
  console.log(`[UI Setup] Session established for ${credentials.email}`);
});
