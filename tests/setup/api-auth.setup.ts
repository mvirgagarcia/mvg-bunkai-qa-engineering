/**
 * KATA Architecture - API Auth Setup (Project)
 *
 * Authenticates via API directly using AuthApi.authenticateSuccessfully() ATC.
 * Mints a short-lived Personal Access Token for use by Integration tests.
 *
 * Dependencies: global-setup
 * Dependents: integration
 */

import type { ApiState } from '@data/types';

import { writeFileSync } from 'node:fs';
import { test as setup } from '@TestFixture';
import { attachRequestResponseToAllure } from '@utils/allure';
import { config } from '@variables';

const apiStateFile = config.auth.apiStatePath;

/**
 * API Authentication Setup
 *
 * 1. Uses AuthApi.authenticateSuccessfully() ATC
 * 2. Saves token to api-state.json for integration tests
 */
setup('API Setup: authenticate via API', async ({ api }) => {
  console.log('[API Setup] Starting API authentication...');
  console.log(`[API Setup] Target: ${config.apiUrl}${config.auth.loginEndpoint}`);

  // Every signin mints a PAT row on the shared database: name it and let it expire.
  const credentials = {
    email: config.testUser.email,
    password: config.testUser.password,
    pat_name: 'kata-api-setup',
    pat_expires_in_days: config.auth.patExpiresInDays,
  };
  const [response, tokenData] = await api.auth.authenticateSuccessfully(credentials);
  const { pat } = tokenData;

  // Attach to Allure for debugging (no token, no password)
  await attachRequestResponseToAllure({
    url: response.url(),
    method: 'POST',
    responseBody: { user: tokenData.user, pat: { id: pat.id, name: pat.name, scopes: pat.scopes, expires_at: pat.expires_at } },
    requestBody: { email: credentials.email, password: '***' },
  });

  const expiresIn = pat.expires_at
    ? Math.max(0, Math.round((Date.parse(pat.expires_at) - Date.now()) / 1000))
    : config.auth.tokenLifetimeSeconds;
  console.log('[API Setup] Authentication successful');
  console.log(`[API Setup] PAT scopes: ${pat.scopes.join(', ')}; expires in ${expiresIn} seconds`);

  // Save the PAT for use by integration tests
  const apiState: ApiState = {
    token: pat.token,
    tokenType: 'Bearer',
    expiresIn,
    refreshToken: null,
    source: 'api-login',
    createdAt: new Date().toISOString(),
  };

  writeFileSync(apiStateFile, JSON.stringify(apiState, null, 2));
  console.log(`[API Setup] Token saved to ${apiStateFile}`);
});
