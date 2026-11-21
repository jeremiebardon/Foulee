import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  listActivitiesQuerySchema,
  listActivitiesResponseSchema,
  type ListActivitiesResponse,
} from '@foulee/contracts';
import { ListActivitiesSince } from '../../application/list-activities-since';
import { toListActivitiesResponse } from './activity.mapper';
import { BearerTokenGuard } from './bearer-token.guard';

@Controller('v1/activities')
@UseGuards(BearerTokenGuard)
export class ActivitiesController {
  constructor(private readonly listActivitiesSince: ListActivitiesSince) {}

  @Get()
  async list(@Query() query: unknown): Promise<ListActivitiesResponse> {
    // A ZodError here becomes a 400 invalid_request (see ErrorBodyFilter).
    const { since } = listActivitiesQuerySchema.parse(query);

    const result = await this.listActivitiesSince.execute({ since: since === undefined ? undefined : new Date(since) });

    // Validate what we send: a mapping bug fails here (500), not on the phone.
    return listActivitiesResponseSchema.parse(toListActivitiesResponse(result));
  }
}
