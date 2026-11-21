import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import type { WorkoutCategory, WorkoutItem } from '@/features/workouts/domain';

// Rows mirror the domain types, so repositories need no mapping layer.

export const workouts = sqliteTable('workouts', {
  id: text().primaryKey(),
  name: text().notNull(),
  category: text().$type<WorkoutCategory>().notNull(),
  /** The steps are value objects of the Workout aggregate: stored with it as JSON. */
  items: text({ mode: 'json' }).$type<WorkoutItem[]>().notNull(),
});

export const plans = sqliteTable('plans', {
  id: text().primaryKey(),
  name: text().notNull(),
  startDate: text().notNull(),
  weeks: integer().notNull(),
  selected: integer({ mode: 'boolean' }).notNull().default(false),
});

export const sessions = sqliteTable('sessions', {
  id: text().primaryKey(),
  // Cascades: deleting a plan or a workout removes its sessions, no app code needed.
  planId: text()
    .notNull()
    .references(() => plans.id, { onDelete: 'cascade' }),
  workoutId: text()
    .notNull()
    .references(() => workouts.id, { onDelete: 'cascade' }),
  week: integer().notNull(),
  day: integer().notNull(),
  doneMeters: integer(),
  doneSeconds: integer(),
});
