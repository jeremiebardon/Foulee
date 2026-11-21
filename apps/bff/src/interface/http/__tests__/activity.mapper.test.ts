import { listActivitiesResponseSchema } from '@foulee/contracts';
import type { ListActivitiesSinceResult } from '../../../application/list-activities-since';
import { Activity, Distance, Duration, StartTime } from '../../../domain';
import { toListActivitiesResponse } from '../activity.mapper';

function activityAt(instant: string, utcOffsetMinutes: number, averageHeartRateBpm?: number): Activity {
  return Activity.create({
    id: '42',
    kind: 'running',
    startTime: StartTime.of(new Date(instant), utcOffsetMinutes),
    distance: Distance.ofMeters(10_000),
    duration: Duration.ofSeconds(3_000),
    averageHeartRateBpm,
  });
}

const map = (activities: Activity[], nextCursor?: Date) =>
  toListActivitiesResponse({ activities, nextCursor } satisfies ListActivitiesSinceResult);

describe('toListActivitiesResponse', () => {
  it.each([
    ['UTC', 0, '2026-11-18T06:30:00+00:00'],
    ['east of UTC', 60, '2026-11-18T07:30:00+01:00'],
    ['west of UTC', -300, '2026-11-18T01:30:00-05:00'],
    ['a half-hour offset', -210, '2026-11-18T03:00:00-03:30'],
    ['a 45-minute offset', 345, '2026-11-18T12:15:00+05:45'],
  ])('writes the local start time with its offset: %s', (_label, offsetMinutes, expected) => {
    const [summary] = map([activityAt('2026-11-18T06:30:00Z', offsetMinutes)]).activities;

    expect(summary?.startTime).toBe(expected);
  });

  it('puts the local calendar day of a run near midnight in startTime, not the UTC day', () => {
    const [summary] = map([activityAt('2026-11-18T23:30:00Z', 120)]).activities;

    expect(summary?.startTime).toBe('2026-11-19T01:30:00+02:00');
  });

  it('exposes the measures in the contract units, pace derived in seconds per km', () => {
    const [summary] = map([activityAt('2026-11-18T06:30:00Z', 0)]).activities;

    expect(summary).toMatchObject({
      garminActivityId: '42',
      distanceMeters: 10_000,
      durationSeconds: 3_000,
      averagePaceSecondsPerKm: 300,
    });
  });

  it('includes the heart rate only when the Activity has one', () => {
    const [withHr] = map([activityAt('2026-11-18T06:30:00Z', 0, 151)]).activities;
    const [withoutHr] = map([activityAt('2026-11-18T06:30:00Z', 0)]).activities;

    expect(withHr?.averageHeartRateBpm).toBe(151);
    expect(withoutHr).not.toHaveProperty('averageHeartRateBpm');
  });

  it('writes the next cursor as a UTC instant, or null when there is none', () => {
    expect(map([], new Date('2026-11-18T06:30:00Z')).nextCursor).toBe('2026-11-18T06:30:00.000Z');
    expect(map([]).nextCursor).toBeNull();
  });

  it('only ever produces a contract-valid response', () => {
    const response = map([activityAt('2026-11-18T06:30:00Z', -210, 150)], new Date('2026-11-18T06:30:00Z'));

    expect(listActivitiesResponseSchema.safeParse(response).success).toBe(true);
  });
});
