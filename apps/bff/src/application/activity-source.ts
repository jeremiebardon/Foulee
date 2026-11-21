import type { Activity } from '../domain';

/**
 * Outbound port: where Activities come from. Today the Garmin Connect Personal
 * API; a multi-user Garmin adapter could replace it (ADR 0007).
 */
export interface ActivitySource {
  /**
   * Activities that started after `since` (all of them when it is undefined).
   * A source may already leave out kinds Foulée never imports, such as non-running ones. Rejects with `GarminAccessExpiredError` when the source refuses
   * our access.
   */
  listActivitiesSince(since: Date | undefined): Promise<Activity[]>;
}
