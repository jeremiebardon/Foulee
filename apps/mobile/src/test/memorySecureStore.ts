/**
 * Stand-in for `expo-secure-store`, whose Keychain / Keystore is absent under Jest:
 *
 *   jest.mock('expo-secure-store', () => jest.requireActual('@/test/memorySecureStore'));
 *
 * Only the calls the app uses. `failNextWrite` makes the next write throw, as the native store
 * does when it cannot store a value.
 */
const items = new Map<string, string>();
let writeError: Error | null = null;

export const getItem = (key: string) => items.get(key) ?? null;

export function setItem(key: string, value: string) {
  if (writeError) {
    const error = writeError;
    writeError = null;
    throw error;
  }
  items.set(key, value);
}

export const deleteItemAsync = async (key: string) => void items.delete(key);

export const failNextWrite = () => {
  writeError = new Error('The value could not be stored');
};
