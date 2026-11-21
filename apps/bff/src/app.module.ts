import { Module, type DynamicModule } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ListActivitiesSince } from './application/list-activities-since';
import type { ActivitySource } from './application/activity-source';
import type { Env } from './config/env';
import { GarminPersonalApiActivitySource } from './infrastructure/garmin/garmin-personal-api-activity-source';
import { ActivitiesController } from './interface/http/activities.controller';
import { BearerTokenGuard } from './interface/http/bearer-token.guard';
import { ErrorBodyFilter } from './interface/http/error-body.filter';
import { ACTIVITY_SOURCE, ENV, HTTP_FETCH } from './tokens';

/** Composition root: the only place that knows which adapter backs each port. */
@Module({})
export class AppModule {
  static register(env: Env): DynamicModule {
    return {
      module: AppModule,
      controllers: [ActivitiesController],
      providers: [
        { provide: ENV, useValue: env },
        // Bound so it is still called as a function of globalThis, which Node's fetch requires.
        { provide: HTTP_FETCH, useValue: globalThis.fetch.bind(globalThis) },
        {
          provide: ACTIVITY_SOURCE,
          useFactory: (httpFetch: typeof fetch) =>
            new GarminPersonalApiActivitySource({ apiKey: env.garminPersonalApiKey, fetch: httpFetch }),
          inject: [HTTP_FETCH],
        },
        {
          provide: ListActivitiesSince,
          useFactory: (source: ActivitySource) => new ListActivitiesSince(source),
          inject: [ACTIVITY_SOURCE],
        },
        BearerTokenGuard,
        { provide: APP_FILTER, useClass: ErrorBodyFilter },
      ],
    };
  }
}
