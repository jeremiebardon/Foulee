import { Controller, Get, Inject } from '@nestjs/common';
import type { Env } from '../../config/env';
import { ENV } from '../../tokens';

/**
 * Fly's health check, and the answer to "which commit is running?". Not part of the app's
 * `/v1` API (the app never calls it), so its shape is not in `packages/contracts`. No bearer
 * token: it reveals nothing but a commit SHA of a public repository.
 */
@Controller('health')
export class HealthController {
  constructor(@Inject(ENV) private readonly env: Env) {}

  @Get()
  check(): { status: 'ok'; gitSha: string } {
    return { status: 'ok', gitSha: this.env.gitSha };
  }
}
