import type { z } from 'zod';
import { listActivitiesQuerySchema, listActivitiesResponseSchema } from '../activities';
import { errorBodySchema } from '../errors';

/**
 * Everything that crosses the wire under `/v1`, keyed by where it travels. CI exports it to JSON
 * Schema and compares it with `main` (see the README). Add new endpoints here; a key removed or
 * renamed counts as a removed endpoint.
 */
export const v1Contract: Record<string, z.ZodType> = {
  'GET /v1/activities query': listActivitiesQuerySchema,
  'GET /v1/activities response': listActivitiesResponseSchema,
  'error response body': errorBodySchema,
};
