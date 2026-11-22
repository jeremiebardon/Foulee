import { expoKvStore } from '../kvStore/expoKvStore';
import { expoSecureStore } from '../secureStore/expoSecureStore';
import { services } from '..';

jest.mock('expo-secure-store', () => jest.requireActual('@/test/memorySecureStore'));
jest.mock('expo-sqlite/kv-store', () => jest.requireActual('@/test/memoryKvStore'));

const realFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = realFetch;
});

describe('services', () => {
  it('wires the expo stores', () => {
    expect(services.secureStore).toBe(expoSecureStore);
    expect(services.kvStore).toBe(expoKvStore);
  });

  it('wires an HTTP client over fetch', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ status: 200, ok: true, json: async () => ({ pong: true }) } as unknown as Response);
    globalThis.fetch = fetchMock;

    await expect(services.http.request({ method: 'GET', url: 'https://bff.test/ping' })).resolves.toEqual({ status: 200, ok: true, body: { pong: true } });

    expect(fetchMock).toHaveBeenCalledWith('https://bff.test/ping', expect.objectContaining({ method: 'GET' }));
  });
});
