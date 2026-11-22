import { services } from '@/shared/services';

/**
 * The BFF Access Token, kept through the secure store service: the pasted-once token lives in the
 * Keychain / Keystore, never in the database or the bundle. Its URL comes with the build (appConfig),
 * so the hook that pairs them is useGarminImport (../hooks).
 */
const KEY = 'garmin.bffAccessToken';

const listeners = new Set<() => void>();
/** Read from the secure store once, then kept in step by the writes below. */
let token: string | null | undefined;

/** A stored token, or `null`: none saved, or an entry the OS invalidated (a restored backup, a removed passcode). */
export function storedToken(read: () => string | null): string | null {
  try {
    return read() || null;
  } catch {
    return null;
  }
}

export function readBffToken(): string | null {
  if (token === undefined) token = storedToken(() => services.secureStore.get(KEY));
  return token;
}

function publish(next: string | null) {
  token = next;
  listeners.forEach((listener) => listener());
}

/** For `useSyncExternalStore`: tells `listener` whenever the token is saved or forgotten. */
export const subscribeBffToken = (listener: () => void) => {
  listeners.add(listener);
  return () => void listeners.delete(listener);
};

/** Throws when the phone cannot store it. */
export function saveBffToken(value: string) {
  services.secureStore.set(KEY, value);
  publish(value);
}

export async function forgetBffToken() {
  await services.secureStore.delete(KEY);
  publish(null);
}
