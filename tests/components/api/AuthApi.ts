/**
 * KATA Architecture - Layer 3: Auth API Component
 *
 * API component for authentication operations.
 * Handles login, token management, and user info retrieval.
 *
 * ATCs follow flow-based design: each ATC is an ACTION + VERIFICATION,
 * not a simple GET. Read-only operations are helpers (no @atc).
 *
 * Endpoints (relative to config.apiUrl, which ends in /api):
 * - POST /v1/auth/signin - Session + a Personal Access Token (`pat.token`, the Bearer /api/v1 accepts)
 * - GET /v1/me - Current user, workspaces and how the call authenticated (requires auth)
 */

import type { APIResponse } from '@playwright/test';
import type { AuthErrorResponse, LoginPayload, TokenResponse, UserInfoResponse } from '@schemas/auth.types';
import type { TestContextOptions } from '@TestContext';

import { ApiBase } from '@api/ApiBase';
import { expect } from '@playwright/test';
import { atc, step } from '@utils/decorators';

// Re-export types for consumers that import from AuthApi
export type { AuthErrorResponse, LoginPayload, TokenResponse, UserInfoResponse } from '@schemas/auth.types';

// ============================================
// Auth API Component
// ============================================

export class AuthApi extends ApiBase {
  constructor(options: TestContextOptions) {
    super(options);
  }

  // ============================================
  // Helpers - Read-only operations (no @atc)
  // ============================================

  /**
   * Helper: Get current authenticated user info.
   *
   * Read-only GET — used as a verification step inside ATCs
   * or for test-level assertions. Not an ATC because it's
   * just a data retrieval, not a complete action flow.
   *
   * @returns Tuple with response and user info
   */
  @step
  async getCurrentUser(): Promise<[APIResponse, UserInfoResponse]> {
    const [response, body] = await this.apiGET<UserInfoResponse>(this.config.auth.meEndpoint);
    return [response, body];
  }

  // ============================================
  // ATCs - Complete Test Cases (ACTION + VERIFICATION)
  // ============================================

  /**
   * ATC: Authenticate with valid credentials - expects success (200)
   *
   * Complete flow:
   * 1. POST credentials to /v1/auth/signin (ACTION)
   * 2. GET /v1/me with the minted PAT to confirm it authenticates (VERIFICATION)
   *
   * The PAT is automatically set for subsequent API requests.
   *
   * @param credentials - Email and password (plus optional pat_name / pat_expires_in_days)
   * @returns Tuple with response, signin body, and sent payload
   */
  @atc('BK-ATC-AUTH-1')
  async authenticateSuccessfully(
    credentials: LoginPayload,
  ): Promise<[APIResponse, TokenResponse, LoginPayload]> {
    // ACTION: POST login credentials
    const [response, body, sentPayload] = await this.apiPOST<TokenResponse, LoginPayload>(
      this.config.auth.loginEndpoint,
      credentials,
    );

    // Fixed assertions - validates successful authentication
    expect(response.status()).toBe(200);
    expect(body.session.access_token).toBeTruthy();
    expect(body.pat.token).toMatch(/^bk_pat_/);

    // Store the PAT for subsequent requests
    this.setAuthToken(body.pat.token);

    // VERIFICATION: Confirm the PAT authenticates via GET /v1/me
    const [meResponse, meBody] = await this.getCurrentUser();
    expect(meResponse.status()).toBe(200);
    expect(meBody.user.email?.toLowerCase()).toBe(credentials.email.toLowerCase());
    expect(meBody.auth.source).toBe('bearer');

    return [response, body, sentPayload];
  }

  /**
   * ATC: Login with invalid credentials - expects error (401)
   *
   * Complete flow:
   * 1. POST invalid credentials to /v1/auth/signin (ACTION)
   * 2. GET /v1/me without a token to confirm NO session was created (VERIFICATION)
   *
   * Bunkai answers every bad signin with the same 401, so the body says nothing
   * about whether the email or the password was wrong.
   *
   * @param credentials - Invalid email or password
   * @returns Tuple with error response and sent payload
   */
  @atc('BK-ATC-AUTH-2')
  async loginWithInvalidCredentials(
    credentials: LoginPayload,
  ): Promise<[APIResponse, AuthErrorResponse, LoginPayload]> {
    // ACTION: POST invalid credentials
    const [response, body, sentPayload] = await this.apiPOST<AuthErrorResponse, LoginPayload>(
      this.config.auth.loginEndpoint,
      credentials,
    );

    // Fixed assertions - validates the uniform error envelope
    expect(response.status()).toBe(401);
    expect(body.error.code).toBe('unauthorized');

    // VERIFICATION: Confirm no session was created via GET /v1/me → 401
    const savedToken = this.authToken;
    this.clearAuthToken();
    const [meResponse] = await this.getCurrentUser();
    expect(meResponse.status()).toBe(401);
    // Restore token if one existed before this ATC
    if (savedToken) {
      this.setAuthToken(savedToken);
    }

    return [response, body, sentPayload];
  }
}
