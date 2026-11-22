import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { healthResponseSchema } from '@foulee/contracts';
import request from 'supertest';
import { AppModule } from '../../../app.module';
import type { Env } from '../../../config/env';

const SHA = '3f9c2a1b7d4e5f60718293a4b5c6d7e8f9012345';
const env: Env = { garminPersonalApiKey: 'unused-here', bffAccessToken: 'a'.repeat(32), port: 0, gitSha: SHA };

describe('GET /health', () => {
  let app: INestApplication;

  async function start(withEnv: Env) {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule.register(withEnv)] }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    await app.init();
  }

  beforeEach(() => start(env));

  afterEach(async () => {
    await app.close();
  });

  it('answers without a bearer token, so Fly can check the machine', async () => {
    const res = await request(app.getHttpServer()).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('reports the git SHA the running image was built from', async () => {
    const res = await request(app.getHttpServer()).get('/health');

    expect(res.body.gitSha).toBe(SHA);
  });

  it('answers in the shape packages/contracts defines', async () => {
    const res = await request(app.getHttpServer()).get('/health');

    expect(healthResponseSchema.safeParse(res.body).success).toBe(true);
  });

  it('fails as its own error rather than answer outside the contract', async () => {
    await app.close();
    await start({ ...env, gitSha: '' });

    const res = await request(app.getHttpServer()).get('/health');

    expect(res.status).toBe(500);
  });
});
