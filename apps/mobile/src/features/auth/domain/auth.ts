/**
 * Port: the screens only know this interface. A real provider (Supabase,
 * Auth0, your NestJS BFF…) is a new adapter, with no change to the UI.
 */
export type AuthSession = { email: string; signedInAt: number };
export type OtpChallenge = { expiresAt: number; /** only set by the demo adapter, which sends no email */ demoCode?: string };

export type AuthErrorCode = 'invalid_email' | 'invalid_code' | 'expired' | 'too_many_attempts';
export class AuthError extends Error {
  constructor(readonly code: AuthErrorCode) {
    super(code);
  }
}

export interface AuthGateway {
  requestCode(email: string): Promise<OtpChallenge>;
  verifyCode(email: string, code: string): Promise<AuthSession>;
}

export const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.trim());
