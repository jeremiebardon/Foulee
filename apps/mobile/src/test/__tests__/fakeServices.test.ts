import { services } from '@/shared/services';
import { HttpNetworkError } from '@/shared/services/http/HttpClient';
import { failNextSecureRead, failNextSecureWrite, givenHttpResponse, lastHttpRequest, resetFakeServices } from '@/test/fakeServices';

jest.mock('@/shared/services', () => jest.requireActual('@/test/fakeServices').fakeServicesModule());

beforeEach(resetFakeServices);

describe('fakeServices', () => {
  it('serves queued HTTP responses in order and remembers the last request', async () => {
    givenHttpResponse({ status: 200, ok: true, body: 1 });
    givenHttpResponse(new HttpNetworkError('offline'));

    await expect(services.http.request({ method: 'GET', url: 'a' })).resolves.toMatchObject({ body: 1 });
    await expect(services.http.request({ method: 'GET', url: 'b' })).rejects.toBeInstanceOf(HttpNetworkError);
    expect(lastHttpRequest()).toEqual({ method: 'GET', url: 'b' });
  });

  it('fails loudly when no response was given', async () => {
    await expect(services.http.request({ method: 'GET', url: 'a' })).rejects.toThrow('No HTTP response given');
  });

  it('keeps both stores in memory and empties them on reset', async () => {
    services.secureStore.set('s', '1');
    services.kvStore.set('k', '2');
    expect([services.secureStore.get('s'), services.kvStore.get('k')]).toEqual(['1', '2']);
    services.kvStore.delete('k');
    await services.secureStore.delete('s');
    expect([services.secureStore.get('s'), services.kvStore.get('k')]).toEqual([null, null]);

    services.kvStore.set('k', '2');
    resetFakeServices();
    expect(services.kvStore.get('k')).toBeNull();
  });

  it('fails the next secure read or write once', () => {
    failNextSecureRead();
    expect(() => services.secureStore.get('s')).toThrow();
    expect(services.secureStore.get('s')).toBeNull();

    failNextSecureWrite();
    expect(() => services.secureStore.set('s', '1')).toThrow();
    services.secureStore.set('s', '1');
    expect(services.secureStore.get('s')).toBe('1');
  });
});
