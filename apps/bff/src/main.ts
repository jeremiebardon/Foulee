import { existsSync } from 'node:fs';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { loadEnv } from './config/env';

async function bootstrap(): Promise<void> {
  // Local development: .env.local (git-ignored). Variables already set in the
  // environment (Fly secrets in production) win over the file.
  if (existsSync('.env.local')) {
    process.loadEnvFile('.env.local');
  }

  // Fails fast, before anything listens, when a required variable is missing.
  const env = loadEnv(process.env);

  const app = await NestFactory.create(AppModule.register(env));
  app.enableShutdownHooks();
  await app.listen(env.port);
}

bootstrap().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
