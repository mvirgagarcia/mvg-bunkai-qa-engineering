/**
 * KATA Framework - Type Facade: Auth Domain
 *
 * Type definitions for the Bunkai authentication endpoints, derived from the
 * synced OpenAPI contract (`bun run api:sync`).
 *
 * Consumed by: tests/components/api/AuthApi.ts, tests/setup/ui-auth.setup.ts
 *
 * The exported names (LoginPayload, TokenResponse, ...) are the framework's
 * stable names; they now point at the real Bunkai schemas.
 */

import type { components, paths } from '@openapi';

// ============================================================================
// Schema Types (from components.schemas)
// ============================================================================

export type SigninBody = components['schemas']['SigninBody'];
export type SigninResponse = components['schemas']['SigninResponse'];
export type MeResponse = components['schemas']['MeResponse'];
export type ErrorEnvelope = components['schemas']['ErrorEnvelope'];

// ============================================================================
// Endpoint Types - POST /api/v1/auth/signin
// ============================================================================

type SigninPath = paths['/api/v1/auth/signin']['post'];

/** Request body: email + password, plus optional PAT name, scopes and expiry in days. */
export type LoginPayload = SigninPath['requestBody']['content']['application/json'];

/** 200 body: the Supabase session AND a freshly minted Personal Access Token (`pat.token`). */
export type TokenResponse = SigninPath['responses']['200']['content']['application/json'];

/** The PAT block of the signin response; `token` is the Bearer `/api/v1` accepts. */
export type PatToken = TokenResponse['pat'];

/** 401 body: the uniform error envelope (no hint whether the email or the password was wrong). */
export type AuthErrorResponse = SigninPath['responses']['401']['content']['application/json'];

// ============================================================================
// Endpoint Types - GET /api/v1/me
// ============================================================================

type MePath = paths['/api/v1/me']['get'];

/** 200 body: the user, their workspaces, the active workspace and how the call authenticated. */
export type UserInfoResponse = MePath['responses']['200']['content']['application/json'];
