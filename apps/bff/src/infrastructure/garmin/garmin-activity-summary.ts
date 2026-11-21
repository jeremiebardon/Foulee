import { z } from 'zod';
import type { ActivityKind } from '../../domain';

const garminTime = z.string().regex(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/, 'expected yyyy-MM-dd HH:mm:ss');

/**
 * The fields Foulée reads from Garmin's SummarizedActivityDTO (the Personal API spec has
 * about 230; the rest are dropped). Units per the spec: meters, seconds, beats per minute.
 */
const garminActivitySummarySchema = z.object({
  activityId: z.number().int(),
  activityType: z.object({ typeKey: z.string(), parentTypeId: z.number().int().optional() }),
  startTimeGMT: garminTime,
  startTimeLocal: garminTime,
  distance: z.number().optional(),
  duration: z.number().optional(),
  averageHR: z.number().optional(),
});

export const garminActivityListSchema = z.array(garminActivitySummarySchema);

export type GarminActivitySummary = z.infer<typeof garminActivitySummarySchema>;

/** Garmin's typeId of the `running` parent type; every running subtype has it as parentTypeId. */
const RUNNING_TYPE_ID = 1;

const KIND_BY_TYPE_KEY: Readonly<Record<string, ActivityKind>> = {
  running: 'running',
  trail_running: 'trail_running',
  treadmill_running: 'treadmill_running',
  track_running: 'track_running',
};

/**
 * Foulée's kind for a Garmin running type, or undefined for anything that is not running.
 * Running subtypes Foulée has no kind of its own for (street_running, ultra_run, ...) are `running`.
 */
export function toRunningKind(type: GarminActivitySummary['activityType']): ActivityKind | undefined {
  if (Object.hasOwn(KIND_BY_TYPE_KEY, type.typeKey)) return KIND_BY_TYPE_KEY[type.typeKey];
  return type.parentTypeId === RUNNING_TYPE_ID ? 'running' : undefined;
}
