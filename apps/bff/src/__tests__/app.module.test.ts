import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { listActivitiesResponseSchema } from '@foulee/contracts';
import request from 'supertest';
import { AppModule } from '../app.module';
import type { Env } from '../config/env';

const TOKEN = 'a'.repeat(32);
const env: Env = { garminPersonalApiKey: 'unused-while-garmin-is-faked', bffAccessToken: TOKEN, port: 0 };

describe('AppModule (composition root, nothing overridden)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule.register(env)] }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('serves the sample running Activities from the in-memory source, oldest first', async () => {
    const res = await request(app.getHttpServer()).get('/v1/activities').set('Authorization', `Bearer ${TOKEN}`);

    expect(res.status).toBe(200);
    const body = listActivitiesResponseSchema.parse(res.body);
    expect(body.activities.map((a) => a.garminActivityId)).toEqual([
      '1000000001',
      '1000000003',
      '1000000004',
      '1000000005',
    ]);
  });

  it('guards the route with the configured token', async () => {
    const res = await request(app.getHttpServer()).get('/v1/activities').set('Authorization', 'Bearer wrong');

    expect(res.status).toBe(401);
  });
});
