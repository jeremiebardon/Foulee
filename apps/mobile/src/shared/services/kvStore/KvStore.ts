/** Non-secret key-value storage. Synchronous, so a first render can read it. */
export interface KvStore {
  get(key: string): string | null;
  set(key: string, value: string): void;
  delete(key: string): void;
}
