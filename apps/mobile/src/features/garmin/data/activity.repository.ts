import { eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { db } from '@/db/client';
import { activities, importCursors, sessions } from '@/db/schema';
import type { Activity } from '../domain/activity';
import type { ActivitiesPage } from './bff.api';
import { linking, unlinking } from '../domain/link';

// ---- Reads -----------------------------------------------------------------

export const useActivities = (): Activity[] => useLiveQuery(db.select().from(activities)).data;

/** Where the next import resumes: the cursor the BFF returned last time, `null` before the first import. */
export const readImportCursor = (): string | null =>
  db.select({ cursor: importCursors.cursor }).from(importCursors).where(eq(importCursors.source, 'garmin')).get()?.cursor ?? null;

// ---- Writes ----------------------------------------------------------------
// Synchronous `.run()`/`.all()`: a Drizzle query that is never awaited never executes.

/**
 * Stores a page of imported Activities and the cursor to resume from, in one transaction.
 * Idempotent on the Garmin activity id: an Activity already stored is left as it is, link
 * included. Returns how many Activities were new.
 */
export const saveImport = ({ activities: page, nextCursor }: ActivitiesPage): number =>
  db.transaction((tx) => {
    const added = page.length
      ? tx.insert(activities).values(page).onConflictDoNothing({ target: activities.garminActivityId }).returning({ id: activities.garminActivityId }).all().length
      : 0;
    if (nextCursor !== null) {
      tx.insert(importCursors)
        .values({ source: 'garmin', cursor: nextCursor })
        .onConflictDoUpdate({ target: importCursors.source, set: { cursor: nextCursor } })
        .run();
    }
    return added;
  });

/**
 * Links an Activity to the Session it completes, as `linking` says: the Session is done with the
 * Activity's distance and duration, and the Activity keeps what had been logged by hand on it.
 * The unique index on `session_id` refuses a second Activity for the same Session.
 */
export const linkActivity = (activity: Activity, sessionId: string) =>
  db.transaction((tx) => {
    const session = tx
      .select({ id: sessions.id, doneMeters: sessions.doneMeters, doneSeconds: sessions.doneSeconds })
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .get();
    if (!session) return;
    const writes = linking(activity, session);
    tx.update(activities).set(writes.activity).where(eq(activities.garminActivityId, activity.garminActivityId)).run();
    tx.update(sessions).set(writes.session).where(eq(sessions.id, sessionId)).run();
  });

/**
 * Makes a linked Activity an Unplanned Activity again, as `unlinking` says: its Session gets back
 * what had been logged on it by hand, or is no longer done, and is not suggested for it again.
 */
export const unlinkActivity = (activity: Activity) =>
  db.transaction((tx) => {
    const writes = unlinking(activity);
    tx.update(activities).set(writes.activity).where(eq(activities.garminActivityId, activity.garminActivityId)).run();
    if (activity.sessionId !== null) tx.update(sessions).set(writes.session).where(eq(sessions.id, activity.sessionId)).run();
  });

/** The runner declined the suggested Session: the Activity stays unplanned and the suggestion goes away. */
export const declineSuggestion = ({ garminActivityId }: Activity, sessionId: string) =>
  db.update(activities).set({ declinedSessionId: sessionId }).where(eq(activities.garminActivityId, garminActivityId)).run();
