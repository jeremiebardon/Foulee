import type { Activity } from '../domain';
import type { ActivitySource } from './activity-source';

export interface ListActivitiesSinceInput {
  /** The cursor the client got last time; absent on a first import. */
  since?: Date;
}

export interface ListActivitiesSinceResult {
  /** Running Activities that started after `since`, oldest first. */
  activities: Activity[];
  /** What to send as `since` next time. */
  nextCursor: Date | undefined;
}

export class ListActivitiesSince {
  constructor(private readonly source: ActivitySource) {}

  async execute({ since }: ListActivitiesSinceInput): Promise<ListActivitiesSinceResult> {
    const fromSource = await this.source.listActivitiesSince(since);

    const activities = fromSource
      .filter((activity) => activity.isRun())
      .filter((activity) => since === undefined || activity.startTime.isAfter(since))
      .sort(
        (a, b) =>
          a.startTime.instant.getTime() - b.startTime.instant.getTime() || a.id.localeCompare(b.id),
      );

    const latest = activities.at(-1);
    return { activities, nextCursor: latest ? latest.startTime.instant : since };
  }
}
