/**
 * KATA Architecture - Layer 3: Runs API Component
 *
 * API component for Run execution: start a Run of a Test against an
 * environment, mark its steps, then finish or abort it.
 *
 * SHARED-DATA POLICY: staging is one shared database and a Run can never be
 * deleted (no delete route). The write ATCs below leave a permanent Run, so they
 * run only in tests launched on purpose, never in the daily @critical smoke, and
 * every free text they write carries the [QA-AUTO] marker (DataFactory.createRunNotes).
 *
 * Endpoints (relative to config.apiUrl, which ends in /api):
 * - POST /v1/runs                          - start (Idempotency-Key header required)
 * - GET  /v1/runs/{id}                     - read one Run with its ATCs and steps
 * - POST /v1/runs/{id}/steps/{stepId}/mark - mark a step passed / failed / blocked
 * - POST /v1/runs/{id}/finish              - close with a verdict (passed / failed)
 * - POST /v1/runs/{id}/abort               - close with a reason (3 to 500 chars)
 * - GET  /v1/tests/{id}/runs               - a Test's run history
 * - GET  /v1/projects/{id}/runs/report     - a Project's runs with pass/fail totals
 */

import type { APIResponse } from '@playwright/test';
import type {
  AbortRunRequest,
  AbortRunResponse,
  CreateRunRequest,
  CreateRunResponse,
  FinishRunRequest,
  FinishRunResponse,
  GetRunResponse,
  MarkStepRequest,
  MarkStepResponse,
  ProjectRunReportResponse,
  TestRunHistoryResponse,
} from '@schemas/runs.types';
import type { TestContextOptions } from '@TestContext';

import { randomUUID } from 'node:crypto';
import { ApiBase } from '@api/ApiBase';
import { expect } from '@playwright/test';
import { atc, step } from '@utils/decorators';

// Re-export types for consumers that import from RunsApi
export type { CreateRunRequest, GetRunResponse, ProjectRunReportResponse, TestRunHistoryResponse } from '@schemas/runs.types';

// ============================================
// Runs API Component
// ============================================

export class RunsApi extends ApiBase {
  private readonly endpoints = {
    create: '/v1/runs',
    get: (id: string) => `/v1/runs/${id}`,
    mark: (id: string, stepId: string) => `/v1/runs/${id}/steps/${stepId}/mark`,
    finish: (id: string) => `/v1/runs/${id}/finish`,
    abort: (id: string) => `/v1/runs/${id}/abort`,
    testHistory: (testId: string) => `/v1/tests/${testId}/runs`,
    projectReport: (projectId: string) => `/v1/projects/${projectId}/runs/report`,
  };

  constructor(options: TestContextOptions) {
    super(options);
  }

  // ============================================
  // Helpers - Read-only operations (no @atc)
  // ============================================

  /** Helper: read one Run with its snapshot chain (ATCs and steps). */
  @step
  async getRun(runId: string): Promise<[APIResponse, GetRunResponse]> {
    return this.apiGET<GetRunResponse>(this.endpoints.get(runId));
  }

  /** Helper: a Test's past Runs, newest first. */
  @step
  async getTestRunHistory(testId: string): Promise<[APIResponse, TestRunHistoryResponse]> {
    return this.apiGET<TestRunHistoryResponse>(this.endpoints.testHistory(testId));
  }

  /** Helper: a Project's Runs with pass/fail totals (optional filters as query params). */
  @step
  async getProjectRunReport(
    projectId: string,
    params: Record<string, string> = {},
  ): Promise<[APIResponse, ProjectRunReportResponse]> {
    return this.apiGET<ProjectRunReportResponse>(this.endpoints.projectReport(projectId), { params });
  }

  // ============================================
  // ATCs - Complete Test Cases (ACTION + VERIFICATION)
  // ============================================

  /**
   * ATC: Start a Run - expects a frozen snapshot with every step pending (201)
   *
   * Leaves a permanent Run on the shared database (see the policy above).
   *
   * @param payload - test_id, environment_id and, for a PAT caller, executor_mode
   * @returns Tuple with response, created Run and sent payload
   */
  @atc('BK-ATC-RUN-1')
  async startRunSuccessfully(
    payload: CreateRunRequest,
  ): Promise<[APIResponse, CreateRunResponse, CreateRunRequest]> {
    // ACTION: POST the run, with the required Idempotency-Key
    const [response, body, sentPayload] = await this.apiPOST<CreateRunResponse, CreateRunRequest>(
      this.endpoints.create,
      payload,
      { headers: { 'Idempotency-Key': randomUUID() } },
    );

    // Fixed assertions - a new running Run whose snapshot is fully pending
    expect(response.status()).toBe(201);
    expect(body.run.status).toBe('running');
    expect(body.run.test_id).toBe(payload.test_id);
    expect(body.run.step_count).toBeGreaterThan(0);
    const steps = body.run.atcs.flatMap(runAtc => runAtc.steps);
    expect(steps.every(runStep => runStep.status === 'pending')).toBe(true);

    return [response, body, sentPayload];
  }

  /**
   * ATC: Mark a step of a running Run - expects the step to carry the result (200)
   *
   * @param runId - A running Run
   * @param stepId - One of its run steps
   * @param payload - status (passed / failed / blocked) and optional note / evidence_url
   * @returns Tuple with response, updated Run and sent payload
   */
  @atc('BK-ATC-RUN-2')
  async markStepSuccessfully(
    runId: string,
    stepId: string,
    payload: MarkStepRequest,
  ): Promise<[APIResponse, MarkStepResponse, MarkStepRequest]> {
    // ACTION: POST the mark
    const [response, body, sentPayload] = await this.apiPOST<MarkStepResponse, MarkStepRequest>(
      this.endpoints.mark(runId, stepId),
      payload,
    );

    // Fixed assertions - the step holds the result and an execution time
    expect(response.status()).toBe(200);
    const marked = body.run.atcs.flatMap(runAtc => runAtc.steps).find(runStep => runStep.id === stepId);
    expect(marked?.status).toBe(payload.status);
    expect(marked?.executed_at).toBeTruthy();

    return [response, body, sentPayload];
  }

  /**
   * ATC: Finish a running Run with a verdict - expects it closed, no step left pending (200)
   *
   * @param runId - A running Run
   * @param payload - verdict (passed / failed)
   * @returns Tuple with response, closed Run and sent payload
   */
  @atc('BK-ATC-RUN-3')
  async finishRunSuccessfully(
    runId: string,
    payload: FinishRunRequest,
  ): Promise<[APIResponse, FinishRunResponse, FinishRunRequest]> {
    // ACTION: POST the verdict
    const [response, body, sentPayload] = await this.apiPOST<FinishRunResponse, FinishRunRequest>(
      this.endpoints.finish(runId),
      payload,
    );

    // Fixed assertions - closed with the verdict; pending steps became skipped
    expect(response.status()).toBe(200);
    expect(body.run.status).toBe(payload.verdict);
    expect(body.run.finished_at).toBeTruthy();
    const steps = body.run.atcs.flatMap(runAtc => runAtc.steps);
    expect(steps.some(runStep => runStep.status === 'pending')).toBe(false);

    return [response, body, sentPayload];
  }

  /**
   * ATC: Abort a running Run with a reason - expects it aborted with that reason (200)
   *
   * @param runId - A running Run
   * @param payload - reason (3 to 500 characters)
   * @returns Tuple with response, aborted Run and sent payload
   */
  @atc('BK-ATC-RUN-4')
  async abortRunSuccessfully(
    runId: string,
    payload: AbortRunRequest,
  ): Promise<[APIResponse, AbortRunResponse, AbortRunRequest]> {
    // ACTION: POST the abort
    const [response, body, sentPayload] = await this.apiPOST<AbortRunResponse, AbortRunRequest>(
      this.endpoints.abort(runId),
      payload,
    );

    // Fixed assertions - aborted with the reason; pending steps became skipped
    expect(response.status()).toBe(200);
    expect(body.run.status).toBe('aborted');
    expect(body.run.abort_reason).toBe(payload.reason);
    const steps = body.run.atcs.flatMap(runAtc => runAtc.steps);
    expect(steps.some(runStep => runStep.status === 'pending')).toBe(false);

    return [response, body, sentPayload];
  }
}
