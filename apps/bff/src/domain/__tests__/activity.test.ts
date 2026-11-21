import { Activity, type ActivityProps } from '../activity';
import { InvalidActivityError } from '../errors';
import { ACTIVITY_KINDS, isRunning } from '../activity-kind';
import { Distance, Duration } from '../measures';
import { StartTime } from '../start-time';

function props(overrides: Partial<ActivityProps> = {}): ActivityProps {
  return {
    id: '19876543210',
    kind: 'running',
    startTime: StartTime.of(new Date('2026-11-18T06:30:00Z'), 60),
    distance: Distance.ofMeters(10_000),
    duration: Duration.ofSeconds(3000),
    ...overrides,
  };
}

describe('Activity', () => {
  it('derives its average pace from distance and duration', () => {
    // 10 km in 50 minutes
    expect(Activity.create(props()).averagePace.secondsPerKm).toBe(300);
  });

  it('keeps what it was created with', () => {
    const activity = Activity.create(props({ averageHeartRateBpm: 152 }));
    expect(activity.id).toBe('19876543210');
    expect(activity.kind).toBe('running');
    expect(activity.startTime.instant).toEqual(new Date('2026-11-18T06:30:00Z'));
    expect(activity.startTime.utcOffsetMinutes).toBe(60);
    expect(activity.distance.meters).toBe(10_000);
    expect(activity.duration.seconds).toBe(3000);
    expect(activity.averageHeartRateBpm).toBe(152);
  });

  it('has no heart rate when the watch did not record one', () => {
    expect(Activity.create(props()).averageHeartRateBpm).toBeUndefined();
  });

  it.each([0, -50, 150.5, Number.NaN])('rejects a heart rate of %s', (averageHeartRateBpm) => {
    expect(() => Activity.create(props({ averageHeartRateBpm }))).toThrow(InvalidActivityError);
  });

  it('rejects an empty id', () => {
    expect(() => Activity.create(props({ id: '' }))).toThrow(InvalidActivityError);
  });
});

describe('only running is imported', () => {
  it.each(['running', 'trail_running', 'treadmill_running', 'track_running'] as const)(
    'counts %s as running',
    (kind) => {
      expect(isRunning(kind)).toBe(true);
      expect(Activity.create(props({ kind })).isRun()).toBe(true);
    },
  );

  it.each(ACTIVITY_KINDS.filter((kind) => !kind.endsWith('running')))('does not count %s as running', (kind) => {
    expect(isRunning(kind)).toBe(false);
    expect(Activity.create(props({ kind })).isRun()).toBe(false);
  });
});

describe('StartTime', () => {
  it('knows whether it is strictly after an instant', () => {
    const start = StartTime.of(new Date('2026-11-18T06:30:00Z'), 60);
    expect(start.isAfter(new Date('2026-11-18T06:29:59Z'))).toBe(true);
    expect(start.isAfter(new Date('2026-11-18T06:30:00Z'))).toBe(false);
    expect(start.isAfter(new Date('2026-11-18T06:30:01Z'))).toBe(false);
  });

  it('rejects an invalid date', () => {
    expect(() => StartTime.of(new Date('nope'), 0)).toThrow(InvalidActivityError);
  });

  it.each([0.5, 841, -841, Number.NaN])('rejects a UTC offset of %s minutes', (offset) => {
    expect(() => StartTime.of(new Date('2026-11-18T06:30:00Z'), offset)).toThrow(InvalidActivityError);
  });

  it.each([-720, 0, 330, 840])('accepts a UTC offset of %s minutes', (offset) => {
    expect(StartTime.of(new Date('2026-11-18T06:30:00Z'), offset).utcOffsetMinutes).toBe(offset);
  });
});
