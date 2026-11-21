import { z } from 'zod';

/** Machine-readable error codes of the v1 API. Additive-only: never remove or rename one. */
export const errorCodeSchema = z.enum([
  'unauthorized',
  'invalid_request',
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
