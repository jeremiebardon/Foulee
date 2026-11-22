import { services } from '@/shared/services';
import type { AuthSession } from '../domain/auth';

const KEY = 'auth.session';

/** Stores the session that the next AuthProvider starts with; the e2e reset link (src/e2e) signs in this way. */
export function saveSession(s: AuthSession | null) {
  if (s) services.kvStore.set(KEY, JSON.stringify(s));
  else services.kvStore.delete(KEY);
}

/** Read synchronously, so a first render already knows where to route. */
export function readSession(): AuthSession | null {
  return JSON.parse(services.kvStore.get(KEY) ?? 'null');
}
