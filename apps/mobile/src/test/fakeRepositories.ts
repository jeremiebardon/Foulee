import { useSyncExternalStore } from 'react';
import type { Activity } from '@/features/garmin/domain';
import { toSessionViews, type DoneRun, type Plan, type Session } from '@/features/plans/domain';
import type { Workout } from '@/features/workouts/domain';

/**
 * Fakes for the repository modules, the one mock seam of screen tests (ADR 0003). Reads return
 * the data given to `givenData`, resolved by the real domain code; writes are `jest.fn()`s that
 * tests assert on. Wire them with a factory, so the database layer never loads:
 *
 *   jest.mock('./plan.repository', () => jest.requireActual('@/test/fakeRepositories').fakePlanRepository());
 */
type Data = { workouts: Workout[]; plans: Plan[]; sessions: Session[]; activities: Activity[]; importCursor: string | null };

const empty: Data = { workouts: [], plans: [], sessions: [], activities: [], importCursor: null };
let data: Data = empty;

// Imports write while a screen is open: like a live query, the fake re-renders its readers.
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => void listeners.delete(listener);
};
const change = (patch: Partial<Data>) => {
  data = { ...data, ...patch };
  listeners.forEach((listener) => listener());
};

export const givenData = (given: Partial<Data>) => change({ ...empty, ...given });

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

/**
 * Imports behave like the real repository: an Activity already stored, by Garmin activity id, is
 * skipped, the cursor moves on, and the number of Activities actually added is returned.
 */
export const fakeActivityRepository = () => ({
  useActivities: () => useSyncExternalStore(subscribe, () => data.activities),
  readImportCursor: () => data.importCursor,
  saveImport: jest.fn(({ activities, nextCursor }: { activities: Activity[]; nextCursor: string | null }) => {
    const known = new Set(data.activities.map((a) => a.garminActivityId));
    const added = activities.filter((a) => !known.has(a.garminActivityId));
    change({ activities: [...data.activities, ...added], importCursor: nextCursor ?? data.importCursor });
    return added.length;
  }),
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
