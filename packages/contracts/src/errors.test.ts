import { errorBodySchema, errorCodeSchema } from './index';

describe('errorBodySchema', () => {
  it.each(['unauthorized', 'invalid_request', 'not_found', 'garmin_access_expired', 'internal_error'])(
    'accepts the %s code',
    (code) => {
      const body = { code, message: 'nope' };
      expect(errorBodySchema.parse(body)).toEqual(body);
    },
  );

  it('rejects an unknown code', () => {
    expect(errorBodySchema.safeParse({ code: 'teapot', message: 'nope' }).success).toBe(false);
  });

  it('exposes the list of codes', () => {
    expect(errorCodeSchema.options).toEqual([
      'unauthorized',
      'invalid_request',
      'not_found',
      'garmin_access_expired',
      'internal_error',
    ]);
  });
});
