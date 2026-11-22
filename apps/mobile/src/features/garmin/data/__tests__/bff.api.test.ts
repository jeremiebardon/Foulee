import { HttpNetworkError } from '@/shared/services/http/HttpClient';
import { givenHttpResponse, lastHttpRequest, resetFakeServices } from '@/test/fakeServices';
import { BffError, fetchActivitiesSince } from '../bff.api';

// The BFF is reached through the HTTP service: the fake answers each request the test queues.
jest.mock('@/shared/services', () => jest.requireActual('@/test/fakeServices').fakeServicesModule());

beforeEach(resetFakeServices);

const bffAnswers = (status: number, body: unknown) => givenHttpResponse({ status, ok: status >= 200 && status < 300, body });

const fetchActivities = (since: string | null = null) => fetchActivitiesSince({ bffUrl: 'https://bff.test', token: 'tok' }, since);

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
      activities: [{ ...run, averageHeartRateBpm: null, sessionId: null, declinedSessionId: null, handLoggedMeters: null, handLoggedSeconds: null }],
      nextCursor: '2026-11-17T06:30:00.000Z',
    });
    expect(lastHttpRequest()).toEqual({
      method: 'GET',
      url: 'https://bff.test/v1/activities',
      headers: { Accept: 'application/json', Authorization: 'Bearer tok' },
      timeoutMs: 20_000,
    });
  });

  it('asks only for Activities after the cursor of the last import', async () => {
    bffAnswers(200, { activities: [], nextCursor: '2026-11-17T06:30:00.000Z' });
    await expect(fetchActivities('c1')).resolves.toEqual({ activities: [], nextCursor: '2026-11-17T06:30:00.000Z' });
    expect(lastHttpRequest()).toEqual({
      method: 'GET',
      url: 'https://bff.test/v1/activities?since=c1',
      headers: { Accept: 'application/json', Authorization: 'Bearer tok' },
      timeoutMs: 20_000,
    });
  });

  it('encodes the cursor in the query', async () => {
    bffAnswers(200, { activities: [], nextCursor: null });
    await fetchActivities('2026-11-17T06:30:00.000Z');
    expect(lastHttpRequest()?.url).toBe('https://bff.test/v1/activities?since=2026-11-17T06%3A30%3A00.000Z');
  });

  it('fails as a network failure when the BFF cannot be reached', async () => {
    givenHttpResponse(new HttpNetworkError('offline'));
    await expect(failureOf(fetchActivities())).resolves.toBe('network');
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
    bffAnswers(502, null);
    await expect(failureOf(fetchActivities())).resolves.toBe('unexpected');
  });

  it('rejects a response that breaks the contract, rather than storing bad data', async () => {
    bffAnswers(200, { activities: [{ ...run, distanceMeters: -1 }], nextCursor: null });
    await expect(failureOf(fetchActivities())).resolves.toBe('unexpected');
    bffAnswers(200, null);
    await expect(failureOf(fetchActivities())).resolves.toBe('unexpected');
  });
});
