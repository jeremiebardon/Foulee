import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';
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

/** Runs imported from Garmin through the BFF (src/features/garmin). */
export const activities = sqliteTable('activities', {
  /** Garmin's activity id: the primary key makes re-importing an Activity a no-op. */
  garminActivityId: text().primaryKey(),
  /** ISO 8601 with the offset the run happened in, e.g. 2026-11-18T07:30:00+01:00. */
  startTime: text().notNull(),
  distanceMeters: real().notNull(),
  durationSeconds: real().notNull(),
  averagePaceSecondsPerKm: real().notNull(),
  averageHeartRateBpm: integer(),
  /**
   * The Session this Activity completes; `null` for an Unplanned Activity. Unique: a Session has
   * at most one Activity (SQLite lets any number of rows hold `null`).
   */
  sessionId: text()
    .unique()
    .references(() => sessions.id, { onDelete: 'set null' }),
  /** The suggested Session the runner declined (or unlinked) for this Activity, so it is not suggested again. */
  declinedSessionId: text().references(() => sessions.id, { onDelete: 'set null' }),
});

/** Where each import source resumes: one row per source, holding the cursor it last returned. */
export const importCursors = sqliteTable('import_cursors', {
  source: text().$type<'garmin'>().primaryKey(),
  cursor: text().notNull(),
});
