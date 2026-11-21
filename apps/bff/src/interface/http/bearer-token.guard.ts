import { createHash, timingSafeEqual } from 'node:crypto';
import { Inject, Injectable, UnauthorizedException, type CanActivate, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { Env } from '../../config/env';
import { ENV } from '../../tokens';

const sha256 = (value: string): Buffer => createHash('sha256').update(value).digest();

/**
 * Checks `Authorization: Bearer <BFF_ACCESS_TOKEN>`. Both sides are hashed first
 * so the comparison is constant-time whatever the length of what was sent.
 */
@Injectable()
export class BearerTokenGuard implements CanActivate {
  private readonly expected: Buffer;

  constructor(@Inject(ENV) env: Env) {
    this.expected = sha256(env.bffAccessToken);
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const presented = /^Bearer (.+)$/.exec(request.headers.authorization ?? '')?.[1] ?? '';
    if (!timingSafeEqual(sha256(presented), this.expected)) {
      throw new UnauthorizedException('Missing or invalid bearer token');
    }
    return true;
  }
}
