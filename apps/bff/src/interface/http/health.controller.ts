import { Controller, Get, Inject } from '@nestjs/common';
import { healthResponseSchema, type HealthResponse } from '@foulee/contracts';
import type { Env } from '../../config/env';
import { ENV } from '../../tokens';

/**
 * Fly's health check, and the answer to "which commit is running?". Outside the app's `/v1` API
 * (the app never calls it), but its shape still lives in `packages/contracts`. No bearer token:
 * it reveals nothing but a commit SHA of a public repository.
 */
@Controller('health')
export class HealthController {
  constructor(@Inject(ENV) private readonly env: Env) {}

  @Get()
  check(): HealthResponse {
    // Validate what we send, as for /v1: a body outside the contract is our 500, not a silent pass.
    return healthResponseSchema.parse({ status: 'ok', gitSha: this.env.gitSha });
  }
}
