import type { ActivitySummary } from '@foulee/contracts';
import type { ISODate } from '@/shared/lib/dates';

/**
 * A run recorded by a Garmin device and imported through the BFF (GLOSSARY.md). A fact, unlike a
 * Session, which is an intention. Mirrors the `activities` row. Keyed by Garmin's activity id,
 * so importing it again changes nothing.
 */
export type Activity = {
  garminActivityId: string;
  /** ISO 8601 with the offset the run happened in, e.g. 2026-11-18T07:30:00+01:00. */
  startTime: string;
  distanceMeters: number;
  durationSeconds: number;
  averagePaceSecondsPerKm: number;
  averageHeartRateBpm: number | null;
  /** The Session it completes; `null` for an Unplanned Activity. */
  sessionId: string | null;
  /** The suggested Session the runner declined (or unlinked), so it is not suggested again. */
  declinedSessionId: string | null;
  /**
   * What had been logged by hand on the linked Session before this Activity was linked to it,
   * given back to the Session on unlink; `null` when the Session was not done.
   */
  handLoggedMeters: number | null;
  handLoggedSeconds: number | null;
};

/** An Activity as the BFF serves it (packages/contracts), unlinked until the runner links it. */
export const fromSummary = (summary: ActivitySummary): Activity => ({
  garminActivityId: summary.garminActivityId,
  startTime: summary.startTime,
  distanceMeters: summary.distanceMeters,
  durationSeconds: summary.durationSeconds,
  averagePaceSecondsPerKm: summary.averagePaceSecondsPerKm,
  averageHeartRateBpm: summary.averageHeartRateBpm ?? null,
  sessionId: null,
  declinedSessionId: null,
  handLoggedMeters: null,
  handLoggedSeconds: null,
});

/** The local day the run happened on, where it was run: the date part of its offset start time. */
export const activityDate = (activity: Pick<Activity, 'startTime'>): ISODate => activity.startTime.slice(0, 10);

/** Most recent first, by the instant each run started (start times carry different offsets). */
export const newestFirst = (list: Activity[]): Activity[] =>
  [...list].sort((a, b) => Date.parse(b.startTime) - Date.parse(a.startTime));

/** The import shows only when the build points at a BFF and the runner has saved its access token. */
export const garminImportAvailable = ({ bffUrl, token }: { bffUrl: string | null; token: string | null }) => !!bffUrl && !!token;
