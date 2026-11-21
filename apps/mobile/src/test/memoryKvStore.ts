/**
 * Stand-in for `expo-sqlite/kv-store`, whose native SQLite is absent under Jest:
 *
 *   jest.mock('expo-sqlite/kv-store', () => jest.requireActual('@/test/memoryKvStore'));
 *
 * Only the synchronous calls the app uses. The map lives as long as the test file's module
 * registry, so tests that need a fresh store call `clearSync()`.
 */
const items = new Map<string, string>();

const Storage = {
  getItemSync: (key: string) => items.get(key) ?? null,
  setItemSync: (key: string, value: string) => void items.set(key, value),
  removeItemSync: (key: string) => void items.delete(key),
  clearSync: () => items.clear(),
};

export default Storage;
