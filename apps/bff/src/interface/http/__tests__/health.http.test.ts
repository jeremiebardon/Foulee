import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../../app.module';
import type { Env } from '../../../config/env';

const SHA = '3f9c2a1b7d4e5f60718293a4b5c6d7e8f9012345';
const env: Env = { garminPersonalApiKey: 'unused-here', bffAccessToken: 'a'.repeat(32), port: 0, gitSha: SHA };

describe('GET /health', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule.register(env)] }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    await app.init();
  });

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
});
