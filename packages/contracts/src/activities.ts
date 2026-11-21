import { z } from 'zod';

/** A running Activity, as served by `GET /v1/activities`. */
export const activitySummarySchema = z.object({
  /** Garmin's activity id, as a string so large ids never lose precision. Idempotency key for the app. */
  garminActivityId: z.string().min(1),
  /** ISO 8601 start time with the timezone offset the run happened in (the app needs the local day). */
  startTime: z.iso.datetime({ offset: true }),
  distanceMeters: z.number().positive(),
  durationSeconds: z.number().positive(),
  averagePaceSecondsPerKm: z.number().positive(),
  averageHeartRateBpm: z.number().int().positive().optional(),
});
export type ActivitySummary = z.infer<typeof activitySummarySchema>;

/** Query string of `GET /v1/activities`. */
export const listActivitiesQuerySchema = z.object({
  /** A cursor previously returned as `nextCursor` (an ISO 8601 UTC instant). Absent: from the beginning. */
  since: z.iso.datetime().optional(),
});
export type ListActivitiesQuery = z.infer<typeof listActivitiesQuerySchema>;

/** Response of `GET /v1/activities`: running Activities after the cursor, oldest first. */
export const listActivitiesResponseSchema = z.object({
  activities: z.array(activitySummarySchema),
  /** Pass it as `since` on the next call. `null` only when there is nothing yet and no `since` was given. */
  nextCursor: z.iso.datetime().nullable(),
});
export type ListActivitiesResponse = z.infer<typeof listActivitiesResponseSchema>;
