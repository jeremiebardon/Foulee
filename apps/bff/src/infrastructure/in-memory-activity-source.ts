import type { ActivitySource } from '../application/activity-source';
import { Activity, Distance, Duration, StartTime, type ActivityKind } from '../domain';

/** A stand-in for Garmin: serves a fixed list. Replaced by the Garmin adapter (ticket #4). */
export class InMemoryActivitySource implements ActivitySource {
  constructor(private readonly activities: readonly Activity[]) {}

  async listActivitiesSince(since: Date | undefined): Promise<Activity[]> {
    return this.activities.filter((activity) => since === undefined || activity.startTime.isAfter(since));
  }
}

function sample(
  id: string,
  startedAt: string,
  kind: ActivityKind,
  meters: number,
  seconds: number,
  averageHeartRateBpm?: number,
): Activity {
  return Activity.create({
    id,
    kind,
    startTime: StartTime.of(new Date(startedAt), 60),
    distance: Distance.ofMeters(meters),
    duration: Duration.ofSeconds(seconds),
    averageHeartRateBpm,
  });
}

/** Made-up Activities (not real Garmin data) so the BFF has something to serve while Garmin is faked. */
export function sampleActivities(): Activity[] {
  return [
    sample('1000000001', '2026-11-10T06:30:00Z', 'running', 8_000, 2_480, 148),
    sample('1000000002', '2026-11-12T17:15:00Z', 'cycling', 25_000, 3_600, 131),
    sample('1000000003', '2026-11-14T07:45:00Z', 'running', 12_050, 3_700, 155),
    sample('1000000004', '2026-11-16T06:00:00Z', 'trail_running', 15_300, 5_400),
    sample('1000000005', '2026-11-18T06:30:00Z', 'running', 5_000, 1_450, 160),
  ];
}
