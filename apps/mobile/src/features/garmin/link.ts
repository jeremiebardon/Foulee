import { diffDays } from '@/shared/lib/dates';
import type { DoneRun, SessionView } from '@/features/plans/domain';
import { activityDate, type Activity } from './activity';

/** The Sessions already completed by an Activity: a Session has at most one. */
const linkedSessionIds = (activities: Activity[]) => new Set(activities.flatMap((a) => (a.sessionId === null ? [] : [a.sessionId])));

/** The longest run first, the planned run rather than a shake-out; at equal distance, the first of the day. */
const mainRunFirst = (a: Activity, b: Activity) => b.distanceMeters - a.distanceMeters || Date.parse(a.startTime) - Date.parse(b.startTime);

/**
 * For each unlinked Activity, the Session to suggest linking it to: the one planned on the
 * Activity's local day in the selected Plan, unless another Activity completes it already or the
 * runner declined it for this Activity. Each Session is suggested to one Activity at most.
 * Keyed by Garmin activity id.
 */
export function suggestions(activities: Activity[], views: SessionView[], planId: string | null): Map<string, SessionView> {
  const taken = linkedSessionIds(activities);
  const unlinked = activities.filter((a) => a.sessionId === null).sort(mainRunFirst);
  const result = new Map<string, SessionView>();
  for (const view of views) {
    if (view.plan.id !== planId || taken.has(view.session.id)) continue;
    const match = unlinked.find((a) => activityDate(a) === view.date && a.declinedSessionId !== view.session.id && !result.has(a.garminActivityId));
    if (match) result.set(match.garminActivityId, view);
  }
  return result;
}

/**
 * The Sessions an Activity can be linked to by hand (a Session done a day late): those of the
 * selected Plan no Activity completes yet, nearest the Activity's local day first.
 */
export function linkCandidates(activity: Activity, activities: Activity[], views: SessionView[], planId: string | null): SessionView[] {
  const taken = linkedSessionIds([activity, ...activities]);
  const day = activityDate(activity);
  const distance = (view: SessionView) => Math.abs(diffDays(view.date, day));
  return views
    .filter((view) => view.plan.id === planId && !taken.has(view.session.id))
    .sort((a, b) => distance(a) - distance(b) || a.date.localeCompare(b.date));
}

/** What linking records on the Session: the Activity's distance and duration, as logging the run by hand would. */
export const activityRun = (activity: Pick<Activity, 'distanceMeters' | 'durationSeconds'>): DoneRun => ({
  meters: Math.round(activity.distanceMeters),
  seconds: Math.round(activity.durationSeconds),
});
