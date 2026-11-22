import Storage from 'expo-sqlite/kv-store';
import type { KvStore } from './KvStore';

export const expoKvStore: KvStore = {
  get: (key) => Storage.getItemSync(key),
  set: (key, value) => Storage.setItemSync(key, value),
  delete: (key) => void Storage.removeItemSync(key),
};
