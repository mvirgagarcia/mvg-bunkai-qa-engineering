/**
 * KATA Framework - Type Facade: Runs Domain
 *
 * Type definitions for the Bunkai Run endpoints (start, read, mark a step,
 * finish, abort, history, project report), derived from the synced OpenAPI
 * contract (`bun run api:sync`).
 *
 * Consumed by: tests/components/api/RunsApi.ts
 */

import type { components, paths } from '@openapi';

// ============================================================================
// Schema Types (from components.schemas)
// ============================================================================

export type Run = components['schemas']['Run'];
export type RunAtc = components['schemas']['RunAtc'];
export type RunStep = components['schemas']['RunStep'];
export type RunHistoryPage = components['schemas']['RunHistoryPage'];
export type RunReportPage = components['schemas']['RunReportPage'];

// ============================================================================
// Endpoint Types - POST /api/v1/runs (Idempotency-Key header required)
// ============================================================================

type CreateRunPath = paths['/api/v1/runs']['post'];
export type CreateRunRequest = CreateRunPath['requestBody']['content']['application/json'];
export type CreateRunResponse = CreateRunPath['responses']['201']['content']['application/json'];

// ============================================================================
// Endpoint Types - GET /api/v1/runs/{id}
// ============================================================================

type GetRunPath = paths['/api/v1/runs/{id}']['get'];
export type GetRunResponse = GetRunPath['responses']['200']['content']['application/json'];

// ============================================================================
// Endpoint Types - POST /api/v1/runs/{id}/steps/{stepId}/mark
// ============================================================================

type MarkStepPath = paths['/api/v1/runs/{id}/steps/{stepId}/mark']['post'];
export type MarkStepRequest = MarkStepPath['requestBody']['content']['application/json'];
export type MarkStepResponse = MarkStepPath['responses']['200']['content']['application/json'];

// ============================================================================
// Endpoint Types - POST /api/v1/runs/{id}/finish and /abort
// ============================================================================

type FinishRunPath = paths['/api/v1/runs/{id}/finish']['post'];
export type FinishRunRequest = FinishRunPath['requestBody']['content']['application/json'];
export type FinishRunResponse = FinishRunPath['responses']['200']['content']['application/json'];

type AbortRunPath = paths['/api/v1/runs/{id}/abort']['post'];
export type AbortRunRequest = AbortRunPath['requestBody']['content']['application/json'];
export type AbortRunResponse = AbortRunPath['responses']['200']['content']['application/json'];

// ============================================================================
// Endpoint Types - read-only reports
// ============================================================================

type TestRunHistoryPath = paths['/api/v1/tests/{id}/runs']['get'];
export type TestRunHistoryResponse = TestRunHistoryPath['responses']['200']['content']['application/json'];

type ProjectRunReportPath = paths['/api/v1/projects/{id}/runs/report']['get'];
export type ProjectRunReportResponse = ProjectRunReportPath['responses']['200']['content']['application/json'];
