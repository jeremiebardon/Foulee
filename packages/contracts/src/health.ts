import { z } from 'zod';

/**
 * Response of `GET /health`: Fly's health check, and the answer to "which commit is running?".
 * Outside `/v1` and never called by the app, but still an API shape, so it lives here.
 */
export const healthResponseSchema = z.object({
  status: z.literal('ok'),
  /** The commit the running build was made from, or `unknown` for a local build. */
  gitSha: z.string().min(1),
});
export type HealthResponse = z.infer<typeof healthResponseSchema>;
