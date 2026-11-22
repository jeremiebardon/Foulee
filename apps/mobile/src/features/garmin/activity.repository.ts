import { eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { db } from '@/db/client';
import { activities, importCursors } from '@/db/schema';
import type { Activity } from './activity';
import type { ActivitiesPage } from './bff.client';

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
