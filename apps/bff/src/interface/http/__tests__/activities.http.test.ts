import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { errorBodySchema, listActivitiesResponseSchema } from '@foulee/contracts';
import request from 'supertest';
import { AppModule } from '../../../app.module';
import { ACTIVITY_SOURCE } from '../../../tokens';
import type { ActivitySource } from '../../../application/activity-source';
import type { Env } from '../../../config/env';
import {
  Activity,
  Distance,
  Duration,
  GarminAccessExpiredError,
  StartTime,
  type ActivityKind,
} from '../../../domain';

const TOKEN = 'a-long-random-bff-access-token';
const env: Env = { garminPersonalApiKey: 'unused-here', bffAccessToken: TOKEN, port: 0, gitSha: 'unknown' };

function activity(
  id: string,
  startedAt: string,
  options: { kind?: ActivityKind; offset?: number; heartRate?: number } = {},
): Activity {
  return Activity.create({
    id,
    kind: options.kind ?? 'running',
    startTime: StartTime.of(new Date(startedAt), options.offset ?? 0),
    distance: Distance.ofMeters(10_000),
    duration: Duration.ofSeconds(3000),
    averageHeartRateBpm: options.heartRate,
  });
}

/** Stands in for Garmin: returns what it holds, or fails with what it was told to. */
class FakeActivitySource implements ActivitySource {
  constructor(private readonly outcome: Activity[] | Error) {}

  async listActivitiesSince(): Promise<Activity[]> {
    if (this.outcome instanceof Error) throw this.outcome;
    return this.outcome;
  }
}

describe('GET /v1/activities', () => {
  let app: INestApplication;

  async function startWith(outcome: Activity[] | Error): Promise<void> {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule.register(env)] })
      .overrideProvider(ACTIVITY_SOURCE)
      .useValue(new FakeActivitySource(outcome))
      .compile();
    app = moduleRef.createNestApplication({ logger: false });
    await app.init();
  }

  const authorized = () => request(app.getHttpServer()).get('/v1/activities').set('Authorization', `Bearer ${TOKEN}`);

  afterEach(async () => {
    await app.close();
  });

  describe('bearer token', () => {
    beforeEach(() => startWith([]));

    const expectUnauthorized = (res: request.Response): void => {
      expect(res.status).toBe(401);
      expect(errorBodySchema.parse(res.body).code).toBe('unauthorized');
    };

    it('rejects a request with no token', async () => {
      expectUnauthorized(await request(app.getHttpServer()).get('/v1/activities'));
    });

    it('rejects a wrong token', async () => {
      expectUnauthorized(
        await request(app.getHttpServer()).get('/v1/activities').set('Authorization', 'Bearer not-the-token'),
      );
    });

    it('rejects a wrong token of the same length', async () => {
      const sameLength = 'z'.repeat(TOKEN.length);
      expectUnauthorized(
        await request(app.getHttpServer()).get('/v1/activities').set('Authorization', `Bearer ${sameLength}`),
      );
    });

    it('rejects the right token under another scheme', async () => {
      expectUnauthorized(
        await request(app.getHttpServer()).get('/v1/activities').set('Authorization', `Basic ${TOKEN}`),
      );
    });

    it('rejects the token with nothing after Bearer', async () => {
      expectUnauthorized(await request(app.getHttpServer()).get('/v1/activities').set('Authorization', 'Bearer '));
    });

    it('rejects a bare Bearer scheme with no token at all', async () => {
      expectUnauthorized(await request(app.getHttpServer()).get('/v1/activities').set('Authorization', 'Bearer'));
    });

    it('rejects a token with a space inside it', async () => {
      expectUnauthorized(
        await request(app.getHttpServer()).get('/v1/activities').set('Authorization', `Bearer ${TOKEN} extra`),
      );
    });

    it.each(['bearer', 'BEARER'])('accepts the %s scheme in any case', async (scheme) => {
      const res = await request(app.getHttpServer()).get('/v1/activities').set('Authorization', `${scheme} ${TOKEN}`);
      expect(res.status).toBe(200);
    });

    it('accepts more than one space between the scheme and the token', async () => {
      const res = await request(app.getHttpServer()).get('/v1/activities').set('Authorization', `Bearer   ${TOKEN}`);
      expect(res.status).toBe(200);
    });

    it('lets the right token through', async () => {
      expect((await authorized()).status).toBe(200);
    });
  });

  describe('listing', () => {
    it('returns contract-valid running Activities, oldest first, with the next cursor', async () => {
      await startWith([
        activity('2', '2026-11-19T06:30:00Z', { offset: 60, heartRate: 152 }),
        activity('ride', '2026-11-19T12:00:00Z', { kind: 'cycling' }),
        activity('1', '2026-11-18T17:45:00Z', { offset: -300 }),
      ]);

      const res = await authorized();

      expect(res.status).toBe(200);
      expect(listActivitiesResponseSchema.parse(res.body)).toEqual({
        activities: [
          {
            garminActivityId: '1',
            startTime: '2026-11-18T12:45:00-05:00',
            distanceMeters: 10_000,
            durationSeconds: 3000,
            averagePaceSecondsPerKm: 300,
          },
          {
            garminActivityId: '2',
            startTime: '2026-11-19T07:30:00+01:00',
            distanceMeters: 10_000,
            durationSeconds: 3000,
            averagePaceSecondsPerKm: 300,
            averageHeartRateBpm: 152,
          },
        ],
        nextCursor: '2026-11-19T06:30:00.000Z',
      });
    });

    it('omits the heart rate when the watch recorded none', async () => {
      await startWith([activity('1', '2026-11-18T06:30:00Z')]);

      const res = await authorized();

      expect(res.body.activities[0]).not.toHaveProperty('averageHeartRateBpm');
    });

    it('writes a zero offset as +00:00 and keeps a half-hour offset', async () => {
      await startWith([
        activity('utc', '2026-11-18T06:30:00Z', { offset: 0 }),
        activity('india', '2026-11-19T06:30:00Z', { offset: 330 }),
      ]);

      const res = await authorized();

      expect(res.body.activities.map((a: { startTime: string }) => a.startTime)).toEqual([
        '2026-11-18T06:30:00+00:00',
        '2026-11-19T12:00:00+05:30',
      ]);
    });

    it('returns only Activities after the since cursor', async () => {
      await startWith([
        activity('old', '2026-11-17T06:30:00Z'),
        activity('new', '2026-11-19T06:30:00Z'),
      ]);

      const res = await authorized().query({ since: '2026-11-18T00:00:00.000Z' });

      expect(res.status).toBe(200);
      expect(listActivitiesResponseSchema.parse(res.body).activities.map((a) => a.garminActivityId)).toEqual(['new']);
    });

    it('hands the cursor back when there is nothing new', async () => {
      await startWith([activity('old', '2026-11-17T06:30:00Z')]);

      const res = await authorized().query({ since: '2026-11-18T00:00:00.000Z' });

      expect(res.body).toEqual({ activities: [], nextCursor: '2026-11-18T00:00:00.000Z' });
    });

    it('returns a null cursor when there is nothing at all', async () => {
      await startWith([]);

      const res = await authorized();

      expect(res.body).toEqual({ activities: [], nextCursor: null });
    });
  });

  describe('errors', () => {
    it('answers 400 invalid_request to a since that is not a cursor', async () => {
      await startWith([]);

      const res = await authorized().query({ since: 'yesterday' });

      expect(res.status).toBe(400);
      expect(errorBodySchema.parse(res.body).code).toBe('invalid_request');
    });

    it('answers 404 in the error body shape for an unknown route', async () => {
      await startWith([]);

      const res = await request(app.getHttpServer()).get('/v1/nothing').set('Authorization', `Bearer ${TOKEN}`);

      expect(res.status).toBe(404);
      expect(errorBodySchema.parse(res.body).code).toBe('not_found');
    });

    it('answers 502 garmin_access_expired when Garmin refuses our access', async () => {
      await startWith(new GarminAccessExpiredError());

      const res = await authorized();

      expect(res.status).toBe(502);
      expect(errorBodySchema.parse(res.body).code).toBe('garmin_access_expired');
    });

    it('answers 500 internal_error, not 400, when our own response breaks the contract', async () => {
      // A positive but absurdly small distance makes the derived pace infinite: the response is invalid.
      await startWith([
        Activity.create({
          id: '1',
          kind: 'running',
          startTime: StartTime.of(new Date('2026-11-18T06:30:00Z'), 0),
          distance: Distance.ofMeters(Number.MIN_VALUE),
          duration: Duration.ofSeconds(3000),
        }),
      ]);

      const res = await authorized();

      expect(res.status).toBe(500);
      expect(errorBodySchema.parse(res.body)).toEqual({ code: 'internal_error', message: 'Internal server error' });
    });

    it('answers 500 internal_error without leaking the cause', async () => {
      await startWith(new Error('database password is hunter2'));

      const res = await authorized();

      expect(res.status).toBe(500);
      expect(errorBodySchema.parse(res.body).code).toBe('internal_error');
      expect(JSON.stringify(res.body)).not.toContain('hunter2');
    });
  });
});
