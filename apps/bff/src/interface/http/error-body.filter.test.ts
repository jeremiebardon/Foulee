import {
  ForbiddenException,
  HttpException,
  Logger,
  NotFoundException,
  PayloadTooLargeException,
  type ArgumentsHost,
} from '@nestjs/common';
import { ErrorBodyFilter } from './error-body.filter';

/** Runs the filter on an exception and returns what it would have written to the response. */
function respondTo(exception: unknown): { status: number; body: unknown } {
  const sent = { status: 0, body: undefined as unknown };
  const response = {
    status(code: number) {
      sent.status = code;
      return this;
    },
    json(body: unknown) {
      sent.body = body;
    },
  };
  const host = { switchToHttp: () => ({ getResponse: () => response }) } as unknown as ArgumentsHost;
  new ErrorBodyFilter().catch(exception, host);
  return sent;
}

describe('ErrorBodyFilter', () => {
  it('maps a 404 to not_found', () => {
    expect(respondTo(new NotFoundException('Cannot GET /nope'))).toEqual({
      status: 404,
      body: { code: 'not_found', message: 'Cannot GET /nope' },
    });
  });

  it('maps a 403 to unauthorized, keeping the status', () => {
    expect(respondTo(new ForbiddenException('No'))).toEqual({
      status: 403,
      body: { code: 'unauthorized', message: 'No' },
    });
  });

  it('maps any other 4xx to invalid_request, keeping the status', () => {
    expect(respondTo(new PayloadTooLargeException('Too big'))).toEqual({
      status: 413,
      body: { code: 'invalid_request', message: 'Too big' },
    });
  });

  it('maps an HttpException of 500 or more to a logged internal_error without its message', () => {
    const logged = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    expect(respondTo(new HttpException('secret detail', 503))).toEqual({
      status: 500,
      body: { code: 'internal_error', message: 'Internal server error' },
    });
    expect(logged).toHaveBeenCalledTimes(1);
    logged.mockRestore();
  });
});
