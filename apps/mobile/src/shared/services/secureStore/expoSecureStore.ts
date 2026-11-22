import * as SecureStoreModule from 'expo-secure-store';
import type { SecureStore } from './SecureStore';

export const expoSecureStore: SecureStore = {
  get: (key) => SecureStoreModule.getItem(key),
  set: (key, value) => SecureStoreModule.setItem(key, value),
  delete: (key) => SecureStoreModule.deleteItemAsync(key),
};
