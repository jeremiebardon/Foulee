import { GarminAccessExpiredError, type Activity } from '../../../domain';
import { GarminPersonalApiActivitySource } from '../garmin-personal-api-activity-source';
import { FakeGarmin, RECORDED_PAGE_SIZE, RECORDED_TOKEN_EXPIRES_AT, RECORDED_TOKEN_ISSUED_AT } from './fake-garmin';

const API_KEY = 'personal-api-key-under-test';

function sourceFor(garmin: FakeGarmin, options: { now?: () => number; warn?: (message: string) => void } = {}) {
  return new GarminPersonalApiActivitySource({
    apiKey: API_KEY,
    fetch: garmin.fetch,
    now: options.now ?? (() => RECORDED_TOKEN_ISSUED_AT),
    pageSize: RECORDED_PAGE_SIZE,
    logger: { warn: options.warn ?? (() => undefined) },
  });
}

const summary = (a: Activity) => ({
  id: a.id,
  kind: a.kind,
  startedAt: a.startTime.instant.toISOString(),
  utcOffsetMinutes: a.startTime.utcOffsetMinutes,
  meters: a.distance.meters,
  seconds: a.duration.seconds,
  heartRate: a.averageHeartRateBpm,
});

describe('GarminPersonalApiActivitySource', () => {
  describe('reading the activity list', () => {
    it('keeps the running Activities from every recorded page and maps them to the domain', async () => {
      const activities = await sourceFor(new FakeGarmin()).listActivitiesSince(undefined);

      expect(activities.map(summary)).toEqual([
        {
          id: '9000000007',
          kind: 'running',
          startedAt: '2026-11-19T06:31:12.000Z',
          utcOffsetMinutes: 60,
          meters: 10012.37,
          seconds: 3005.2,
          heartRate: 152,
        },
        {
          id: '9000000005',
          kind: 'treadmill_running',
          startedAt: '2026-11-17T18:15:40.000Z',
          utcOffsetMinutes: 60,
          meters: 8000,
          seconds: 2520.9,
          heartRate: undefined,
        },
        {
          id: '9000000004',
          kind: 'trail_running',
          startedAt: '2026-11-15T08:00:03.000Z',
          utcOffsetMinutes: 60,
          meters: 18430.2,
          seconds: 7380.4,
          heartRate: 144,
        },
        {
          // A running subtype Foulée has no kind of its own for (Garmin's street_running).
          id: '9000000003',
          kind: 'running',
          startedAt: '2026-11-13T05:45:00.000Z',
          utcOffsetMinutes: 60,
          meters: 5010,
          seconds: 1502.3,
          heartRate: 158,
        },
        {
          id: '9000000002',
          kind: 'running',
          startedAt: '2026-11-10T12:30:00.000Z',
          utcOffsetMinutes: -300,
          meters: 12001.4,
          seconds: 3720,
          heartRate: 149,
        },
      ]);
    });

    it('pages through the list until Garmin returns an empty page', async () => {
      const garmin = new FakeGarmin();

      await sourceFor(garmin).listActivitiesSince(undefined);

      expect(
        garmin.activityListCalls().map(({ url }) => [url.searchParams.get('start'), url.searchParams.get('limit')]),
      ).toEqual([
        ['0', '5'],
        ['5', '5'],
        ['10', '5'],
      ]);
    });

    it('returns an Activity once when an upload during the import shifts it onto the next page', async () => {
      const garmin = new FakeGarmin();
      // Offsets count from the newest activity: one uploaded mid-import pushes the last of page 1 onto page 2.
      const [, , , , fifth, ...rest] = garmin.activities;
      garmin.activities = [...garmin.activities.slice(0, 5), fifth, ...rest];

      const activities = await sourceFor(garmin).listActivitiesSince(undefined);

      expect(activities.map((a) => a.id)).toEqual(['9000000007', '9000000005', '9000000004', '9000000003', '9000000002']);
    });

    it('asks for no start date on a first import', async () => {
      const garmin = new FakeGarmin();

      await sourceFor(garmin).listActivitiesSince(undefined);

      expect(garmin.activityListCalls()[0].url.searchParams.has('startDate')).toBe(false);
    });

    it('returns only Activities that started after `since`', async () => {
      const activities = await sourceFor(new FakeGarmin()).listActivitiesSince(new Date('2026-11-15T08:00:03Z'));

      expect(activities.map((a) => a.id)).toEqual(['9000000007', '9000000005']);
    });

    it('asks Garmin from the day before `since`, since its startDate is an inclusive local date', async () => {
      const garmin = new FakeGarmin();

      await sourceFor(garmin).listActivitiesSince(new Date('2026-11-15T00:30:00Z'));

      expect(garmin.activityListCalls()[0].url.searchParams.get('startDate')).toBe('2026-11-14');
    });
  });

  describe('the bearer token', () => {
    const HOUR = 60 * 60 * 1000;

    it('exchanges the Personal API Key at the token endpoint and sends the token on data calls', async () => {
      const garmin = new FakeGarmin();

      await sourceFor(garmin).listActivitiesSince(undefined);

      const [exchange] = garmin.tokenExchanges();
      expect(exchange.method).toBe('POST');
      expect(exchange.url.href).toBe(
        'https://personal.connectapi.garmin.com/personalapitoken-service/personal-api/personal-api-key/token',
      );
      expect(exchange.headers.get('authorization')).toBe(`ApiKey ${API_KEY}`);
      expect(garmin.activityListCalls().every((call) => call.url.origin === 'https://personal.connectapi.garmin.com')).toBe(true);
      expect(garmin.activityListCalls()).toHaveLength(3); // the fake only serves pages to the recorded token
    });

    it('reuses the token while more than an hour remains before it expires', async () => {
      const garmin = new FakeGarmin();
      let now = RECORDED_TOKEN_ISSUED_AT;
      const source = sourceFor(garmin, { now: () => now });

      await source.listActivitiesSince(undefined);
      now = RECORDED_TOKEN_EXPIRES_AT - HOUR - 1;
      await source.listActivitiesSince(undefined);

      expect(garmin.tokenExchanges()).toHaveLength(1);
    });

    it('exchanges the key again once an hour or less remains', async () => {
      const garmin = new FakeGarmin();
      let now = RECORDED_TOKEN_ISSUED_AT;
      const source = sourceFor(garmin, { now: () => now });

      await source.listActivitiesSince(undefined);
      now = RECORDED_TOKEN_EXPIRES_AT - HOUR;
      await source.listActivitiesSince(undefined);

      expect(garmin.tokenExchanges()).toHaveLength(2);
    });

    it('shares one exchange between calls made at the same time', async () => {
      const garmin = new FakeGarmin();
      const source = sourceFor(garmin);

      await Promise.all([source.listActivitiesSince(undefined), source.listActivitiesSince(undefined)]);

      expect(garmin.tokenExchanges()).toHaveLength(1);
    });

    it('exchanges the key again on the next call after an exchange failed', async () => {
      const garmin = new FakeGarmin();
      garmin.tokenReplies.push({ status: 500, body: '' });
      const source = sourceFor(garmin);

      await expect(source.listActivitiesSince(undefined)).rejects.toThrow();
      await expect(source.listActivitiesSince(undefined)).resolves.toHaveLength(5);
      expect(garmin.tokenExchanges()).toHaveLength(2);
    });

    it('refuses a token that is not a JWT with an expiry, without echoing it', async () => {
      const garmin = new FakeGarmin();
      garmin.tokenReplies.push({ status: 200, body: 'opaque-token-value' });

      const failure = sourceFor(garmin).listActivitiesSince(undefined);

      await expect(failure).rejects.toThrow('Garmin token endpoint did not return a JWT with an exp claim');
      await expect(failure).rejects.not.toThrow('opaque-token-value');
    });
  });

  describe('when Garmin refuses or fails', () => {
    it.each([401, 403])('reports a key refused by the token endpoint (HTTP %i) as expired Garmin access', async (status) => {
      const garmin = new FakeGarmin();
      garmin.tokenReplies.push({ status, body: '{"message":"invalid credentials"}' });

      await expect(sourceFor(garmin).listActivitiesSince(undefined)).rejects.toBeInstanceOf(GarminAccessExpiredError);
    });

    it('exchanges the key again and retries once when the activity list refuses the token', async () => {
      const garmin = new FakeGarmin();
      garmin.activityReplies.push({ status: 401, body: '' });

      const activities = await sourceFor(garmin).listActivitiesSince(undefined);

      expect(garmin.tokenExchanges()).toHaveLength(2);
      expect(activities).toHaveLength(5);
    });

    it('reports expired Garmin access when the activity list still refuses a fresh token', async () => {
      const garmin = new FakeGarmin();
      garmin.activityReplies.push({ status: 401, body: '' }, { status: 401, body: '' });

      await expect(sourceFor(garmin).listActivitiesSince(undefined)).rejects.toBeInstanceOf(GarminAccessExpiredError);
      expect(garmin.tokenExchanges()).toHaveLength(2);
    });

    it('fails a server error from the token endpoint without echoing the key or the response body', async () => {
      const garmin = new FakeGarmin();
      garmin.tokenReplies.push({ status: 500, body: `bad key ${API_KEY}` });

      const failure = sourceFor(garmin).listActivitiesSince(undefined);

      await expect(failure).rejects.toThrow('Garmin token exchange failed with HTTP 500');
      await expect(failure).rejects.not.toThrow(API_KEY);
    });

    it('fails a server error from the activity list with its status', async () => {
      const garmin = new FakeGarmin();
      garmin.activityReplies.push({ status: 503, body: 'down' });

      await expect(sourceFor(garmin).listActivitiesSince(undefined)).rejects.toThrow(
        'Garmin activity list request failed with HTTP 503',
      );
    });

    it('fails an activity list that does not have the documented shape', async () => {
      const garmin = new FakeGarmin();
      garmin.activities = [{ activityId: 'not-a-number' }];

      await expect(sourceFor(garmin).listActivitiesSince(undefined)).rejects.toThrow(
        'Garmin activity list response did not match the Personal API spec',
      );
    });

    it('skips a run Foulée cannot represent, with a warning naming only its id', async () => {
      const garmin = new FakeGarmin();
      const [first, ...rest] = garmin.activities;
      garmin.activities = [{ ...first, distance: 0 }, ...rest];
      const warnings: string[] = [];

      const activities = await sourceFor(garmin, { warn: (message) => warnings.push(message) }).listActivitiesSince(
        undefined,
      );

      expect(activities.map((a) => a.id)).not.toContain('9000000007');
      expect(activities).toHaveLength(4);
      expect(warnings).toEqual([
        'Skipped Garmin activity 9000000007: Distance must be a positive number, got 0',
      ]);
    });

    it.each(['distance', 'duration'])('skips a run Garmin recorded without a %s', async (field) => {
      const garmin = new FakeGarmin();
      const [first, ...rest] = garmin.activities;
      const withoutField = { ...first };
      delete withoutField[field];
      garmin.activities = [withoutField, ...rest];

      const activities = await sourceFor(garmin).listActivitiesSince(undefined);

      expect(activities.map((a) => a.id)).not.toContain('9000000007');
      expect(activities).toHaveLength(4);
    });
  });
});
