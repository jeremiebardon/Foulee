import { and, eq, inArray } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useMemo } from 'react';
import { db } from '@/db/client';
import { plans, sessions } from '@/db/schema';
import { todayISO } from '@/shared/lib/dates';
import { newId } from '@/shared/lib/id';
import { useWorkouts } from '@/features/workouts';
import { copyWeek, normalizeStart, toSessionViews, type DoneRun, type Plan, type Session } from './plan';

// ---- Reads -----------------------------------------------------------------
// One live query per table: useLiveQuery only watches a query's main table,
// so joins are done in memory by the domain (toSessionViews).

export const usePlans = (): Plan[] => useLiveQuery(db.select().from(plans).orderBy(plans.startDate)).data;

/** Every session of every plan, resolved and sorted by date. */
export function useSessionViews() {
  const allPlans = usePlans();
  const workoutList = useWorkouts();
  const rows = useLiveQuery(db.select().from(sessions)).data;
  return useMemo(() => toSessionViews(allPlans, rows, workoutList), [allPlans, rows, workoutList]);
}

// ---- Writes ----------------------------------------------------------------
// Synchronous `.run()`: a Drizzle query that is never awaited never executes.

export function createPlan(): string {
  const id = newId();
  const existing = db.select({ selected: plans.selected }).from(plans).all();
  const selected = !existing.some((p) => p.selected);
  db.insert(plans).values({ id, name: `Plan ${existing.length + 1}`, startDate: normalizeStart(todayISO()), weeks: 8, selected }).run();
  return id;
}

export const updatePlan = (id: string, patch: Partial<Omit<Plan, 'id' | 'selected'>>) =>
  db.update(plans).set(patch).where(eq(plans.id, id)).run();

export const deletePlan = (id: string) => db.delete(plans).where(eq(plans.id, id)).run();

export const selectPlan = (id: string) =>
  db.transaction((tx) => {
    tx.update(plans).set({ selected: false }).run();
    tx.update(plans).set({ selected: true }).where(eq(plans.id, id)).run();
  });

export const addSession = (s: Pick<Session, 'planId' | 'workoutId' | 'week' | 'day'>) =>
  db.insert(sessions).values({ ...s, id: newId() }).run();

export const removeSession = (id: string) => db.delete(sessions).where(eq(sessions.id, id)).run();

/** Replaces the content of the target weeks with a copy of week `from`. */
export const copyPlanWeek = (planId: string, from: number, targets: number[]) =>
  db.transaction((tx) => {
    const source = tx.select().from(sessions).where(and(eq(sessions.planId, planId), eq(sessions.week, from))).all();
    tx.delete(sessions).where(and(eq(sessions.planId, planId), inArray(sessions.week, targets))).run();
    const copies = copyWeek(source, from, targets).map((s) => ({ ...s, id: newId() }));
    if (copies.length) tx.insert(sessions).values(copies).run();
  });

/** Records what was actually run; `null` marks the session as not done. */
export const logRun = (id: string, done: DoneRun | null) =>
  db
    .update(sessions)
    .set({ doneMeters: done?.meters ?? null, doneSeconds: done?.seconds ?? null })
    .where(eq(sessions.id, id))
    .run();
