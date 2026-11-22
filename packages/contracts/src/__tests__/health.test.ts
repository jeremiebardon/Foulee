import { healthResponseSchema } from '../index';

describe('healthResponseSchema', () => {
  it('accepts a running BFF and the commit it was built from', () => {
    const body = { status: 'ok', gitSha: '3f9c2a1b7d4e5f60718293a4b5c6d7e8f9012345' };
    expect(healthResponseSchema.parse(body)).toEqual(body);
  });

  it('accepts a local build, which reports its commit as unknown', () => {
    expect(healthResponseSchema.safeParse({ status: 'ok', gitSha: 'unknown' }).success).toBe(true);
  });

  it('rejects an empty commit', () => {
    expect(healthResponseSchema.safeParse({ status: 'ok', gitSha: '' }).success).toBe(false);
  });

  it('rejects any other status', () => {
    expect(healthResponseSchema.safeParse({ status: 'degraded', gitSha: 'unknown' }).success).toBe(false);
  });
});
