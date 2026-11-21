import { AuthError } from './auth';
import { mockAuthGateway } from './mockAuthGateway';

// The demo adapter mimics a real one-time-code service; these are its rules.
const codeError = (promise: Promise<unknown>) => promise.then(() => null, (e: unknown) => (e instanceof AuthError ? e.code : e));

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('mock auth gateway', () => {
  it('refuses an address that is not an email', async () => {
    expect(await codeError(mockAuthGateway.requestCode('coureur'))).toBe('invalid_email');
  });

  it('returns the code instead of emailing it, and signs in with it once', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.0000425);
    const { demoCode } = await mockAuthGateway.requestCode(' Un@Exemple.com ');
    expect(demoCode).toBe('000042');
    expect(await mockAuthGateway.verifyCode('un@exemple.com', ' 000042 ')).toEqual({ email: 'un@exemple.com', signedInAt: expect.any(Number) });
    // The code is used up.
    expect(await codeError(mockAuthGateway.verifyCode('un@exemple.com', '000042'))).toBe('expired');
  });

  it('knows no code for an address that asked for none', async () => {
    expect(await codeError(mockAuthGateway.verifyCode('personne@exemple.com', '123456'))).toBe('expired');
  });

  it('rejects a wrong code', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.1234565);
    await mockAuthGateway.requestCode('deux@exemple.com');
    expect(await codeError(mockAuthGateway.verifyCode('deux@exemple.com', '654321'))).toBe('invalid_code');
  });

  it('lets a code expire after 5 minutes', async () => {
    jest.useFakeTimers({ now: new Date('2026-11-18T12:00:00') });
    jest.spyOn(Math, 'random').mockReturnValue(0.1234565);
    await mockAuthGateway.requestCode('trois@exemple.com');
    jest.setSystemTime(new Date('2026-11-18T12:05:01'));
    expect(await codeError(mockAuthGateway.verifyCode('trois@exemple.com', '123456'))).toBe('expired');
  });

  it('locks the code after 5 wrong attempts', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.1234565);
    await mockAuthGateway.requestCode('quatre@exemple.com');
    for (let i = 0; i < 5; i++) await codeError(mockAuthGateway.verifyCode('quatre@exemple.com', '000000'));
    expect(await codeError(mockAuthGateway.verifyCode('quatre@exemple.com', '123456'))).toBe('too_many_attempts');
  });
});
