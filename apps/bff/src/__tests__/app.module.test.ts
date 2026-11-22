import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { errorBodySchema, listActivitiesResponseSchema } from '@foulee/contracts';
import request from 'supertest';
import { AppModule } from '../app.module';
import type { Env } from '../config/env';
import { FakeGarmin } from '../infrastructure/garmin/__tests__/fake-garmin';
import { HTTP_FETCH } from '../tokens';

const TOKEN = 'a'.repeat(32);
const API_KEY = 'personal-api-key-under-test';
const env: Env = { garminPersonalApiKey: API_KEY, bffAccessToken: TOKEN, port: 0, gitSha: 'unknown' };

describe('AppModule (composition root, only the network replaced)', () => {
  let app: INestApplication;
  let garmin: FakeGarmin;

  beforeEach(async () => {
    garmin = new FakeGarmin();
    const moduleRef = await Test.createTestingModule({ imports: [AppModule.register(env)] })
      .overrideProvider(HTTP_FETCH)
      .useValue(garmin.fetch)
      .compile();
    app = moduleRef.createNestApplication({ logger: false });
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  const authorized = () => request(app.getHttpServer()).get('/v1/activities').set('Authorization', `Bearer ${TOKEN}`);

  it('serves the running Activities read from the Garmin Personal API, oldest first', async () => {
    const res = await authorized();

    expect(res.status).toBe(200);
    const body = listActivitiesResponseSchema.parse(res.body);
    expect(body.activities.map((a) => a.garminActivityId)).toEqual([
      '9000000002',
      '9000000003',
      '9000000004',
      '9000000005',
      '9000000007',
    ]);
    expect(garmin.tokenExchanges()[0].headers.get('authorization')).toBe(`ApiKey ${API_KEY}`);
  });

  it('answers garmin_access_expired, without the key, when Garmin refuses it', async () => {
    garmin.tokenReplies.push({ status: 401, body: `invalid key ${API_KEY}` });

    const res = await authorized();

    expect(res.status).toBe(502);
    expect(errorBodySchema.parse(res.body).code).toBe('garmin_access_expired');
    expect(JSON.stringify(res.body)).not.toContain(API_KEY);
  });

  it('guards the route with the configured token', async () => {
    const res = await request(app.getHttpServer()).get('/v1/activities').set('Authorization', 'Bearer wrong');

    expect(res.status).toBe(401);
  });
});
