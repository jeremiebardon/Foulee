import type { ActivitySummary, ListActivitiesResponse } from '@foulee/contracts';
import type { ListActivitiesSinceResult } from '../../application/list-activities-since';
import type { Activity, StartTime } from '../../domain';

const pad = (n: number): string => String(n).padStart(2, '0');

/** ISO 8601 local time with the offset the run happened in, e.g. 2026-11-18T07:30:00+01:00. */
function formatStartTime({ instant, utcOffsetMinutes }: StartTime): string {
  const local = new Date(instant.getTime() + utcOffsetMinutes * 60_000);
  const sign = utcOffsetMinutes < 0 ? '-' : '+';
  const offset = Math.abs(utcOffsetMinutes);
  return `${local.toISOString().slice(0, 19)}${sign}${pad(Math.floor(offset / 60))}:${pad(offset % 60)}`;
}

function toSummary(activity: Activity): ActivitySummary {
  return {
    garminActivityId: activity.id,
    startTime: formatStartTime(activity.startTime),
    distanceMeters: activity.distance.meters,
    durationSeconds: activity.duration.seconds,
    averagePaceSecondsPerKm: activity.averagePace.secondsPerKm,
    ...(activity.averageHeartRateBpm !== undefined && { averageHeartRateBpm: activity.averageHeartRateBpm }),
  };
}

export function toListActivitiesResponse(result: ListActivitiesSinceResult): ListActivitiesResponse {
  return {
    activities: result.activities.map(toSummary),
    nextCursor: result.nextCursor?.toISOString() ?? null,
  };
}
