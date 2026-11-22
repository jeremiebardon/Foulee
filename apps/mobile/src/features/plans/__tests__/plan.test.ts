import type { Workout } from '@/features/workouts/domain';
import { copyWeek, normalizeStart, planEnd, sessionDate, toSessionViews, weeklyVolumes, type Plan, type Session } from '../plan';

const plan: Plan = { id: 'p', name: 'Test', startDate: normalizeStart('2026-11-12'), weeks: 3, selected: true };
const workout: Workout = { id: 'w', name: '5 km', category: 'easy', items: [{ kind: 'run', measure: { type: 'distance', meters: 5000 }, pace: 300 }] };
const session = (id: string, week: number, day: number, done = false): Session =>
  ({ id, planId: 'p', workoutId: 'w', week, day, doneMeters: done ? 5000 : null, doneSeconds: done ? 1500 : null });

describe('plan', () => {
  it('starts on a Monday and dates sessions by week and day', () => {
    expect(plan.startDate).toBe('2026-11-09');
    expect(planEnd(plan)).toBe('2026-11-29');
    expect(sessionDate(plan, { week: 1, day: 2 })).toBe('2026-11-18');
  });

  it('joins sessions with plans and workouts, sorted, ignoring orphans and weeks past the end', () => {
    const views = toSessionViews([plan], [session('b', 1, 0, true), session('a', 0, 3), session('x', 5, 0), { ...session('o', 0, 0), workoutId: 'gone' }], [workout]);
    expect(views.map((v) => v.session.id)).toEqual(['a', 'b']);
    expect(views[0].done).toBeNull();
    expect(views[1]).toMatchObject({ date: '2026-11-16', done: { meters: 5000, seconds: 1500 } });
    expect(weeklyVolumes(plan, views)).toEqual([5000, 5000, 0]);
  });

  it('counts a session as done only once it has both a distance and a time', () => {
    const half = { ...session('h', 0, 0), doneMeters: 5000 };
    expect(toSessionViews([plan], [half], [workout])[0].done).toBeNull();
  });

  it('copies a week onto others as not-done sessions', () => {
    const copies = copyWeek([session('a', 0, 1, true), session('b', 0, 4), session('c', 1, 2)], 0, [1, 2]);
    expect(copies.map((c) => [c.week, c.day])).toEqual([[1, 1], [1, 4], [2, 1], [2, 4]]);
    expect(copies.every((c) => c.doneMeters === null)).toBe(true);
  });
});
