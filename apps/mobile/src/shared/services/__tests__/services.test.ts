import { expoKvStore } from '../kvStore/expoKvStore';
import { expoSecureStore } from '../secureStore/expoSecureStore';
import { services } from '..';

jest.mock('expo-secure-store', () => jest.requireActual('@/test/memorySecureStore'));
jest.mock('expo-sqlite/kv-store', () => jest.requireActual('@/test/memoryKvStore'));

describe('services', () => {
  it('wires the expo stores and an HTTP client', () => {
    expect(services.secureStore).toBe(expoSecureStore);
    expect(services.kvStore).toBe(expoKvStore);
    expect(typeof services.http.request).toBe('function');
  });
});
