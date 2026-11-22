import { toSessionViews, type DoneRun, type Plan, type Session } from '@/features/plans/domain';
import type { Workout } from '@/features/workouts/domain';

/**
 * Fakes for the repository modules, the one mock seam of screen tests (ADR 0003). Reads return
 * the data given to `givenData`, resolved by the real domain code; writes are `jest.fn()`s that
 * tests assert on. Wire them with a factory, so the database layer never loads:
 *
 *   jest.mock('./plan.repository', () => jest.requireActual('@/test/fakeRepositories').fakePlanRepository());
 */
type Data = { workouts: Workout[]; plans: Plan[]; sessions: Session[] };

let data: Data = { workouts: [], plans: [], sessions: [] };

export const givenData = (given: Partial<Data>) => {
  data = { workouts: [], plans: [], sessions: [], ...given };
};

export const fakeWorkoutRepository = () => ({
  useWorkouts: () => data.workouts,
  saveWorkout: jest.fn(),
  deleteWorkout: jest.fn(),
});

export const fakePlanRepository = () => ({
  usePlans: () => data.plans,
  useSessionViews: () => toSessionViews(data.plans, data.sessions, data.workouts),
  createPlan: jest.fn(() => 'new-plan'),
  updatePlan: jest.fn(),
  deletePlan: jest.fn(),
  selectPlan: jest.fn(),
  addSession: jest.fn(),
  removeSession: jest.fn(),
  copyPlanWeek: jest.fn(),
  logRun: jest.fn(),
});

/** A session of plan `planId`, not done unless `done` gives what was run. */
export const session = (id: string, planId: string, workoutId: string, week: number, day: number, done?: DoneRun): Session => ({
  id,
  planId,
  workoutId,
  week,
  day,
  doneMeters: done?.meters ?? null,
  doneSeconds: done?.seconds ?? null,
});
