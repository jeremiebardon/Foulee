import { useMemo, useSyncExternalStore } from 'react';
import { linking, unlinking, type Activity } from '@/features/garmin/domain';
import { toSessionViews, type DoneRun, type Plan, type Session } from '@/features/plans/domain';
import type { Workout } from '@/features/workouts/domain';

/**
 * Fakes for the repository modules, the one mock seam of screen tests (ADR 0003). Reads return
 * the data given to `givenData`, resolved by the real domain code; writes are `jest.fn()`s that
 * tests assert on. Wire them with a factory, so the database layer never loads:
 *
 *   jest.mock('../../data/plan.repository', () => jest.requireActual('@/test/fakeRepositories').fakePlanRepository());
 */
type Data = { workouts: Workout[]; plans: Plan[]; sessions: Session[]; activities: Activity[]; importCursor: string | null };

const empty: Data = { workouts: [], plans: [], sessions: [], activities: [], importCursor: null };
let data: Data = empty;

// Imports and links write while a screen is open: like a live query, the fake re-renders its readers.
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => void listeners.delete(listener);
};
const change = (patch: Partial<Data>) => {
  data = { ...data, ...patch };
  listeners.forEach((listener) => listener());
};
const useData = () => useSyncExternalStore(subscribe, () => data);

export const givenData = (given: Partial<Data>) => change({ ...empty, ...given });

export const fakeWorkoutRepository = () => ({
  useWorkouts: () => data.workouts,
  saveWorkout: jest.fn(),
  deleteWorkout: jest.fn(),
});

export const fakePlanRepository = () => ({
  usePlans: () => useData().plans,
  useSessionViews: () => {
    const { plans, sessions, workouts } = useData();
    return useMemo(() => toSessionViews(plans, sessions, workouts), [plans, sessions, workouts]);
  },
  createPlan: jest.fn(() => 'new-plan'),
  updatePlan: jest.fn(),
  deletePlan: jest.fn(),
  selectPlan: jest.fn(),
  addSession: jest.fn(),
  removeSession: jest.fn(),
  copyPlanWeek: jest.fn(),
  logRun: jest.fn(),
});

const patchActivity = (garminActivityId: string, patch: Partial<Activity>) =>
  data.activities.map((a) => (a.garminActivityId === garminActivityId ? { ...a, ...patch } : a));
const patchSession = (id: string | null, patch: Pick<Session, 'doneMeters' | 'doneSeconds'>) =>
  data.sessions.map((s) => (s.id === id ? { ...s, ...patch } : s));

/**
 * Writes behave like the real repository. Imports: an Activity already stored, by Garmin activity
 * id, is skipped, the cursor moves on, and the number of Activities actually added is returned.
 * Links: what the garmin domain says linking and unlinking write (`linking`, `unlinking`).
 */
export const fakeActivityRepository = () => ({
  useActivities: () => useData().activities,
  readImportCursor: () => data.importCursor,
  saveImport: jest.fn(({ activities, nextCursor }: { activities: Activity[]; nextCursor: string | null }) => {
    const known = new Set(data.activities.map((a) => a.garminActivityId));
    const added = activities.filter((a) => !known.has(a.garminActivityId));
    change({ activities: [...data.activities, ...added], importCursor: nextCursor ?? data.importCursor });
    return added.length;
  }),
  linkActivity: jest.fn((activity: Activity, sessionId: string) => {
    const session = data.sessions.find((s) => s.id === sessionId);
    if (!session) return;
    const writes = linking(activity, session);
    change({ activities: patchActivity(activity.garminActivityId, writes.activity), sessions: patchSession(sessionId, writes.session) });
  }),
  unlinkActivity: jest.fn((activity: Activity) => {
    const writes = unlinking(activity);
    change({ activities: patchActivity(activity.garminActivityId, writes.activity), sessions: patchSession(activity.sessionId, writes.session) });
  }),
  declineSuggestion: jest.fn(({ garminActivityId }: Activity, sessionId: string) =>
    change({ activities: patchActivity(garminActivityId, { declinedSessionId: sessionId }) }),
  ),
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
