import {
  Catch,
  HttpException,
  Logger,
  UnauthorizedException,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import type { ErrorBody } from '@foulee/contracts';
import type { Response } from 'express';
import { GarminAccessExpiredError } from '../../domain';

interface ErrorResponse {
  status: number;
  body: ErrorBody;
}

/** Every non-2xx response carries the contract's error body. */
@Catch()
export class ErrorBodyFilter implements ExceptionFilter {
  private readonly logger = new Logger(ErrorBodyFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const { status, body } = this.toResponse(exception);
    host.switchToHttp().getResponse<Response>().status(status).json(body);
  }

  /** Contract code of a 4xx that is not a 401: the status is kept, the code says what kind of refusal it is. */
  private codeForClientError(status: number): ErrorBody['code'] {
    if (status === 404) return 'not_found';
    if (status === 403) return 'unauthorized';
    return 'invalid_request';
  }

  private toResponse(exception: unknown): ErrorResponse {
    if (exception instanceof UnauthorizedException) {
      return { status: 401, body: { code: 'unauthorized', message: exception.message } };
    }
    if (exception instanceof GarminAccessExpiredError) {
      return { status: 502, body: { code: 'garmin_access_expired', message: exception.message } };
    }
    if (exception instanceof HttpException && exception.getStatus() < 500) {
      const status = exception.getStatus();
      return { status, body: { code: this.codeForClientError(status), message: exception.message } };
    }
    this.logger.error(exception instanceof Error ? (exception.stack ?? exception.message) : String(exception));
    return { status: 500, body: { code: 'internal_error', message: 'Internal server error' } };
  }
}
