import { BadRequestException, Controller, Get, Query, UseGuards } from '@nestjs/common';
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
    // Only a bad request is the caller's fault (400). A failure validating our own response below is ours (500).
    const parsedQuery = listActivitiesQuerySchema.safeParse(query);
    if (!parsedQuery.success) {
      const problems = parsedQuery.error.issues.map((issue) => `${issue.path.join('.') || 'query'}: ${issue.message}`);
      throw new BadRequestException(problems.join('; '));
    }
    const { since } = parsedQuery.data;

    const result = await this.listActivitiesSince.execute({ since: since === undefined ? undefined : new Date(since) });

    // Validate what we send: a mapping bug fails here (a logged 500, see ErrorBodyFilter), not on the phone.
    return listActivitiesResponseSchema.parse(toListActivitiesResponse(result));
  }
}
