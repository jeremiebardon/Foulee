import { AuthError, isEmail, type AuthGateway } from './auth';

const TTL_MS = 5 * 60_000;
const MAX_ATTEMPTS = 5;
const pending = new Map<string, { code: string; expiresAt: number; attempts: number }>();
const key = (email: string) => email.trim().toLowerCase();

/**
 * Demo adapter: the code is generated on the device and returned instead of
 * emailed. It mimics a real service's rules but secures nothing.
 */
export const mockAuthGateway: AuthGateway = {
  async requestCode(email) {
    if (!isEmail(email)) throw new AuthError('invalid_email');
    const code = String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0');
    const expiresAt = Date.now() + TTL_MS;
    pending.set(key(email), { code, expiresAt, attempts: 0 });
    return { expiresAt, demoCode: code };
  },

  async verifyCode(email, code) {
    const entry = pending.get(key(email));
    if (!entry || Date.now() > entry.expiresAt) throw new AuthError('expired');
    if (++entry.attempts > MAX_ATTEMPTS) throw new AuthError('too_many_attempts');
    if (entry.code !== code.trim()) throw new AuthError('invalid_code');
    pending.delete(key(email));
    return { email: key(email), signedInAt: Date.now() };
  },
};
