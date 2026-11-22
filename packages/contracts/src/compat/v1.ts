import { listActivitiesQuerySchema, listActivitiesResponseSchema } from '../activities';
import { errorBodySchema } from '../errors';
import type { Contract } from './json-schema';

/**
 * Everything that crosses the wire under `/v1`, keyed by
 * where it travels, with the direction it travels in (which decides the rule it is checked
 * against). CI exports it to JSON Schema and compares it with `main` (see the README). Add new
 * endpoints here; a key removed or renamed counts as a removed endpoint.
 */
export const v1Contract: Contract = {
  'GET /v1/activities query': { direction: 'request', schema: listActivitiesQuerySchema },
  'GET /v1/activities response': { direction: 'response', schema: listActivitiesResponseSchema },
  'error response body': { direction: 'response', schema: errorBodySchema },
};
