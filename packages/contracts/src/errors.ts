import { z } from 'zod';

/**
 * Machine-readable error codes of the v1 API. The BFF sends them and installed apps parse them, so
 * the list is fixed inside `/v1`: a new code is a value an older app rejects (see the README).
 */
export const errorCodeSchema = z.enum([
  'unauthorized',
  'invalid_request',
  'not_found',
  'garmin_access_expired',
  'internal_error',
]);
export type ErrorCode = z.infer<typeof errorCodeSchema>;

/** Body of every non-2xx response. */
export const errorBodySchema = z.object({
  code: errorCodeSchema,
  message: z.string(),
});
export type ErrorBody = z.infer<typeof errorBodySchema>;
