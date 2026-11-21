import type { Activity } from '../domain';

/**
 * Outbound port: where Activities come from. Today the Garmin Connect Personal
 * API; a multi-user Garmin adapter could replace it (ADR 0007).
 */
export interface ActivitySource {
  /**
   * Activities of any kind that started after `since` (all of them when it is
   * undefined). Rejects with `GarminAccessExpiredError` when the source refuses
   * our access.
   */
  listActivitiesSince(since: Date | undefined): Promise<Activity[]>;
}
