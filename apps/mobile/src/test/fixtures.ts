import type { Plan } from '@/features/plans/domain';
import type { Workout } from '@/features/workouts/domain';
import { session } from './fakeRepositories';

/**
 * A small training block shared by the plan, calendar and dashboard tests. Today is
 * Wednesday 18 November 2026, in week 2 of « Objectif 10 km ».
 */
export const TODAY = '2026-11-18';

/** 8 km at 5:30/km = 44 min. */
export const footing: Workout = { id: 'footing', name: 'Footing 8 km', category: 'easy', items: [{ kind: 'run', measure: { type: 'distance', meters: 8000 }, pace: 330 }] };
/** 10 × 400 m at 3:50/km = 4 km in 15 min 20 s, shown as « 15 min ». */
export const vma: Workout = { id: 'vma', name: 'VMA 10 × 400', category: 'intervals', items: [{ kind: 'repeat', count: 10, steps: [{ kind: 'run', measure: { type: 'distance', meters: 400 }, pace: 230 }] }] };

/** Monday 9 to Sunday 29 November. */
export const tenK: Plan = { id: 'p1', name: 'Objectif 10 km', startDate: '2026-11-09', weeks: 3, selected: true };
/** Monday 7 to Sunday 20 December. */
export const marathon: Plan = { id: 'p2', name: 'Marathon', startDate: '2026-12-07', weeks: 2, selected: false };

export const tenKSessions = [
  // Tuesday 10 November, run a bit longer and slower than planned.
  session('s1', 'p1', 'footing', 0, 1, { meters: 8200, seconds: 2700 }),
  // Thursday 19 November, still to do.
  session('s2', 'p1', 'vma', 1, 3),
];
