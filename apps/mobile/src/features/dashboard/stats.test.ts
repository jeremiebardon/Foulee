import { toSessionViews, type Plan, type Session } from '@/features/plans/plan';
import type { Workout } from '@/features/workouts/workout';
import { computeStats, niceCeil } from './stats';

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
