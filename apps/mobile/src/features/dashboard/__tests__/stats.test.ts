import type { Activity } from '@/features/garmin/domain';
import { toSessionViews, type Plan, type Session } from '@/features/plans/domain';
import type { Workout } from '@/features/workouts/domain';
import { computeStats, niceCeil } from '../stats';

const today = '2026-11-15'; // a Sunday
const plan: Plan = { id: 'p', name: 'P', startDate: '2026-11-02', weeks: 3, selected: true };
const other: Plan = { ...plan, id: 'q', selected: false };
const workout: Workout = { id: 'w', name: '10 km', category: 'easy', items: [{ kind: 'run', measure: { type: 'distance', meters: 10000 }, pace: 300 }] };
const s = (id: string, planId: string, week: number, day: number, done?: number): Session =>
  ({ id, planId, workoutId: 'w', week, day, doneMeters: done ?? null, doneSeconds: done ? done * 0.3 : null });

const views = toSessionViews([plan, other], [
  s('a', 'p', 0, 1, 10000), // done, 3 weeks ago... within 28 days
  s('b', 'p', 1, 1), // missed
  s('c', 'p', 1, 3, 9000), // done this week
  s('d', 'p', 1, 6), // today, not done yet
  s('e', 'p', 2, 1), // next week
  s('f', 'q', 1, 2, 5000), // other plan, done this week
], [workout]);

describe('dashboard stats', () => {
  const stats = computeStats(views, 'p', today);

  it('compares this week’s done (all plans) with planned (selected plan)', () => {
    expect(stats.week).toEqual({ planned: 30000, done: 14000, sessionsDone: 1, sessionsPlanned: 3 });
  });

  it('sums the last 28 days and the average pace', () => {
    expect(stats.last28).toEqual({ meters: 24000, seconds: 7200, runs: 3, pace: 300 });
  });

  it('counts adherence on past sessions only, and finds the next one', () => {
    expect(stats.adherence).toEqual({ done: 2, due: 3 });
    expect(stats.next?.session.id).toBe('d');
  });

  it('lists 8 weeks ending with the current one', () => {
    expect(stats.weekly).toHaveLength(8);
    expect(stats.weekly.at(-1)).toEqual({ start: '2026-11-09', planned: 30000, done: 14000, current: true });
  });

  it('rounds the chart axis', () => {
    expect([niceCeil(37), niceCeil(4), niceCeil(260)]).toEqual([40, 5, 300]);
  });
});

describe('dashboard stats with Garmin Activities', () => {
  const activity = (garminActivityId: string, startTime: string, distanceMeters: number, sessionId: string | null = null): Activity => ({
    garminActivityId,
    startTime,
    distanceMeters,
    durationSeconds: distanceMeters * 0.3,
    averagePaceSecondsPerKm: 300,
    averageHeartRateBpm: null,
    sessionId,
    declinedSessionId: null,
  });

  it('counts Unplanned Activities as running done, on the local day they were run', () => {
    // Friday 13 November, an extra 6 km; and a 4 km run late on Sunday 1 November in Montréal (UTC: the 2nd).
    const stats = computeStats(views, 'p', today, [activity('x', '2026-11-13T07:00:00+01:00', 6000), activity('y', '2026-11-01T23:30:00-05:00', 4000)]);
    expect(stats.week).toEqual({ planned: 30000, done: 20000, sessionsDone: 1, sessionsPlanned: 3 });
    expect(stats.last28).toEqual({ meters: 34000, seconds: 10200, runs: 5, pace: 300 });
    expect(stats.weekly.at(-1)).toEqual({ start: '2026-11-09', planned: 30000, done: 20000, current: true });
    // The 1st falls in the week of 26 October.
    expect(stats.weekly.at(-3)).toEqual({ start: '2026-10-26', planned: 0, done: 4000, current: false });
  });

  it('never counts a linked Activity twice: its run is the Session’s', () => {
    // Session c (Thursday 12th) is completed by this Activity: its 9 km already count through the Session.
    const stats = computeStats(views, 'p', today, [activity('linked', '2026-11-12T18:00:00+01:00', 9000, 'c')]);
    expect(stats.week.done).toBe(14000);
    expect(stats.last28.runs).toBe(3);
  });

  it('keeps an Activity whose Session no longer shows, after the Plan was shortened', () => {
    // Session z was in week 5 of a Plan now 3 weeks long: the run still happened.
    const stats = computeStats(views, 'p', today, [activity('orphan', '2026-11-13T07:00:00+01:00', 6000, 'z')]);
    expect(stats.week.done).toBe(20000);
  });

  it('leaves adherence and the next Session to the Plan', () => {
    const stats = computeStats(views, 'p', today, [activity('x', '2026-11-10T07:00:00+01:00', 10000)]);
    expect(stats.adherence).toEqual({ done: 2, due: 3 });
    expect(stats.week.sessionsDone).toBe(1);
  });
});
