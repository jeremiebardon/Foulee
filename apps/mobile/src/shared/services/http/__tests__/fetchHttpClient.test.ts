import { HttpNetworkError } from '../HttpClient';
import { fetchHttpClient } from '../fetchHttpClient';

const realFetch = globalThis.fetch;

const respond = (status: number, json: () => Promise<unknown>) => ({ status, ok: status >= 200 && status < 300, json }) as unknown as Response;

afterEach(() => {
  globalThis.fetch = realFetch;
  jest.useRealTimers();
});

describe('fetchHttpClient', () => {
  it('sends the method, URL and headers, and JSON-encodes a body', async () => {
    const fetchMock = jest.fn().mockResolvedValue(respond(200, async () => ({})));
    globalThis.fetch = fetchMock;

    await fetchHttpClient().request({ method: 'POST', url: 'https://bff.test/x', headers: { Authorization: 'Bearer t' }, body: { a: 1 } });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://bff.test/x',
      expect.objectContaining({
        method: 'POST',
        body: '{"a":1}',
        headers: expect.objectContaining({ 'Content-Type': 'application/json', Authorization: 'Bearer t' }),
      }),
    );
  });

  it('sends no body and no Content-Type when there is no body', async () => {
    const fetchMock = jest.fn().mockResolvedValue(respond(200, async () => ({})));
    globalThis.fetch = fetchMock;

    await fetchHttpClient().request({ method: 'GET', url: 'https://bff.test/x' });

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.body).toBeUndefined();
    expect(init.headers).not.toHaveProperty('Content-Type');
  });

  it('returns status, ok and the parsed JSON body', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue(respond(200, async () => ({ x: 1 })));

    await expect(fetchHttpClient().request({ method: 'GET', url: 'https://bff.test/x' })).resolves.toEqual({ status: 200, ok: true, body: { x: 1 } });
  });

  it('returns a null body when the response is not JSON', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue(respond(502, () => Promise.reject(new SyntaxError('not json'))));

    await expect(fetchHttpClient().request({ method: 'GET', url: 'https://bff.test/x' })).resolves.toEqual({ status: 502, ok: false, body: null });
  });

  it('turns a fetch rejection into HttpNetworkError', async () => {
    globalThis.fetch = jest.fn().mockRejectedValue(new TypeError('Network request failed'));

    await expect(fetchHttpClient().request({ method: 'GET', url: 'https://bff.test/x' })).rejects.toBeInstanceOf(HttpNetworkError);
  });

  it('aborts past timeoutMs and reports HttpNetworkError', async () => {
    jest.useFakeTimers();
    globalThis.fetch = jest.fn(
      (_url: unknown, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
        }),
    );

    const pending = fetchHttpClient().request({ method: 'GET', url: 'https://bff.test/x', timeoutMs: 20_000 });
    const assertion = expect(pending).rejects.toBeInstanceOf(HttpNetworkError);
    await jest.advanceTimersByTimeAsync(20_000);

    await assertion;
  });

  it('leaves no timer behind once a response arrives', async () => {
    jest.useFakeTimers();
    globalThis.fetch = jest.fn().mockResolvedValue(respond(200, async () => ({})));

    await fetchHttpClient().request({ method: 'GET', url: 'https://bff.test/x', timeoutMs: 20_000 });

    expect(jest.getTimerCount()).toBe(0);
  });

  it('uses the fetch in place at call time', async () => {
    const client = fetchHttpClient();
    const later = jest.fn().mockResolvedValue(respond(200, async () => ({})));
    globalThis.fetch = later;

    await client.request({ method: 'GET', url: 'https://bff.test/x' });

    expect(later).toHaveBeenCalledTimes(1);
  });
});
