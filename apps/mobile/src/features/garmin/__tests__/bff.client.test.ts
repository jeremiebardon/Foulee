import { BffError, fetchActivitiesSince } from '../bff.client';

// The network is the boundary: `fetch` is replaced by a stand-in BFF that answers each request.
const realFetch = globalThis.fetch;
const fetchMock = jest.fn<Promise<Response>, [string, RequestInit]>();
beforeEach(() => {
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});
afterEach(() => {
  globalThis.fetch = realFetch;
  jest.useRealTimers();
});

const bffAnswers = (status: number, body: unknown) =>
  fetchMock.mockResolvedValue(new Response(typeof body === 'string' ? body : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }));

const lastRequest = () => {
  const [url, init] = fetchMock.mock.calls.at(-1)!;
  return { url, headers: init.headers };
};

const fetchActivities = (since: string | null = null) => fetchActivitiesSince({ bffUrl: 'http://localhost:3000', token: 'the-token', since });

const failureOf = (promise: Promise<unknown>) =>
  promise.then(
    () => 'no failure',
    (error: unknown) => (error instanceof BffError ? error.reason : error),
  );

const run = {
  garminActivityId: '1001',
  startTime: '2026-11-17T07:30:00+01:00',
  distanceMeters: 8012.5,
  durationSeconds: 2640,
  averagePaceSecondsPerKm: 329.5,
};

describe('fetching Activities from the BFF', () => {
  it('asks for every Activity on the first import, proving it is the owner with the access token', async () => {
    bffAnswers(200, { activities: [run], nextCursor: '2026-11-17T06:30:00.000Z' });
    await expect(fetchActivities()).resolves.toEqual({
      activities: [{ ...run, averageHeartRateBpm: null, sessionId: null, declinedSessionId: null }],
      nextCursor: '2026-11-17T06:30:00.000Z',
    });
    expect(lastRequest()).toEqual({ url: 'http://localhost:3000/v1/activities', headers: { Accept: 'application/json', Authorization: 'Bearer the-token' } });
  });

  it('asks only for Activities after the cursor of the last import', async () => {
    bffAnswers(200, { activities: [], nextCursor: '2026-11-17T06:30:00.000Z' });
    await expect(fetchActivities('2026-11-17T06:30:00.000Z')).resolves.toEqual({ activities: [], nextCursor: '2026-11-17T06:30:00.000Z' });
    expect(lastRequest().url).toBe('http://localhost:3000/v1/activities?since=2026-11-17T06%3A30%3A00.000Z');
  });

  it('fails as a network failure when the BFF cannot be reached', async () => {
    fetchMock.mockRejectedValue(new TypeError('Network request failed'));
    await expect(failureOf(fetchActivities())).resolves.toBe('network');
  });

  it('gives up as a network failure when the BFF does not answer in time', async () => {
    jest.useFakeTimers();
    fetchMock.mockImplementation(
      (_url, init) => new Promise((_resolve, reject) => init.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))),
    );
    const failure = failureOf(fetchActivities());
    await jest.advanceTimersByTimeAsync(20_000);
    await expect(failure).resolves.toBe('network');
  });

  it('fails as unauthorized when the BFF refuses the access token', async () => {
    bffAnswers(401, { code: 'unauthorized', message: 'Missing or invalid bearer token' });
    await expect(failureOf(fetchActivities())).resolves.toBe('unauthorized');
  });

  it('fails as expired Garmin access when the Personal API Key has expired', async () => {
    bffAnswers(502, { code: 'garmin_access_expired', message: 'Garmin refused the Personal API Key' });
    await expect(failureOf(fetchActivities())).resolves.toBe('garmin_access_expired');
  });

  it('fails as unexpected on any other error', async () => {
    bffAnswers(500, { code: 'internal_error', message: 'Internal server error' });
    await expect(failureOf(fetchActivities())).resolves.toBe('unexpected');
    bffAnswers(502, '<html>Bad gateway</html>');
    await expect(failureOf(fetchActivities())).resolves.toBe('unexpected');
  });

  it('rejects a response that breaks the contract, rather than storing bad data', async () => {
    bffAnswers(200, { activities: [{ ...run, distanceMeters: -1 }], nextCursor: null });
    await expect(failureOf(fetchActivities())).resolves.toBe('unexpected');
    bffAnswers(200, 'not json');
    await expect(failureOf(fetchActivities())).resolves.toBe('unexpected');
  });
});
