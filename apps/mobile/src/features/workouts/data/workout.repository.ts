import { asc, eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { db } from '@/db/client';
import { workouts } from '@/db/schema';
import type { Workout } from '../domain/workout';

// Writes run synchronously (`.run()`): a Drizzle query that is never awaited never executes.
// Reads are live: screens re-render when the table changes, wherever the write came from.
export const useWorkouts = (): Workout[] => useLiveQuery(db.select().from(workouts).orderBy(asc(workouts.name))).data;

export const saveWorkout = (w: Workout) =>
  db.insert(workouts).values(w).onConflictDoUpdate({ target: workouts.id, set: w }).run();

/** Also removes the workout's sessions from every plan (FK cascade). */
export const deleteWorkout = (id: string) => db.delete(workouts).where(eq(workouts.id, id)).run();
