import * as SecureStore from 'expo-secure-store';
import { useMemo, useSyncExternalStore } from 'react';
import { appConfig } from '@/shared/config/appConfig';
import { bffAccessOf } from '../domain/bffAccess';

/**
 * Client of the phone's secure store, for access to the BFF: its URL comes with the build
 * (appConfig), the BFF Access Token is pasted once in Settings and kept in the Keychain /
 * Keystore, never in the database or the bundle.
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

function readToken(): string | null {
  if (token === undefined) token = storedToken(() => SecureStore.getItem(KEY));
  return token;
}

function publish(next: string | null) {
  token = next;
  listeners.forEach((listener) => listener());
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => void listeners.delete(listener);
};

/** Throws when the phone cannot store it. */
export function saveBffToken(value: string) {
  SecureStore.setItem(KEY, value);
  publish(value);
}

export async function forgetBffToken() {
  await SecureStore.deleteItemAsync(KEY);
  publish(null);
}

/** The BFF URL and the saved token, and the access they make together (`null`: no Garmin import). */
export function useGarminImport() {
  const token = useSyncExternalStore(subscribe, readToken);
  const { bffUrl } = appConfig();
  // One object per URL and token, so a screen can depend on it.
  const access = useMemo(() => bffAccessOf({ bffUrl, token }), [bffUrl, token]);
  return { bffUrl, token, access };
}
