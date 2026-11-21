import { Module, type DynamicModule } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ListActivitiesSince } from './application/list-activities-since';
import type { ActivitySource } from './application/activity-source';
import type { Env } from './config/env';
import { InMemoryActivitySource, sampleActivities } from './infrastructure/in-memory-activity-source';
import { ActivitiesController } from './interface/http/activities.controller';
import { BearerTokenGuard } from './interface/http/bearer-token.guard';
import { ErrorBodyFilter } from './interface/http/error-body.filter';
import { ACTIVITY_SOURCE, ENV } from './tokens';

export { ACTIVITY_SOURCE, ENV };

/** Composition root: the only place that knows which adapter backs each port. */
@Module({})
export class AppModule {
  static register(env: Env): DynamicModule {
    return {
      module: AppModule,
      controllers: [ActivitiesController],
      providers: [
        { provide: ENV, useValue: env },
        // Garmin is faked until the adapter lands (ticket #4).
        { provide: ACTIVITY_SOURCE, useFactory: () => new InMemoryActivitySource(sampleActivities()) },
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
