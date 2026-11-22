/** Small secrets kept in the phone's Keychain / Keystore. */
export interface SecureStore {
  /** Synchronous. May throw when the OS invalidated the entry. */
  get(key: string): string | null;
  /** Synchronous. Throws when the phone cannot store the value. */
  set(key: string, value: string): void;
  delete(key: string): Promise<void>;
}
