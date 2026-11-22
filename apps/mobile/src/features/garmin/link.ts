import { diffDays } from '@/shared/lib/dates';
import type { Session, SessionView } from '@/features/plans/domain';
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

/** The fields of an Activity that linking and unlinking change. */
type ActivityLink = Pick<Activity, 'sessionId' | 'declinedSessionId' | 'handLoggedMeters' | 'handLoggedSeconds'>;
/** What was run on a Session, as stored: both set, or both `null` while it is not done. */
type SessionDone = Pick<Session, 'doneMeters' | 'doneSeconds'>;

/**
 * What linking writes. The Session is done with the Activity's distance and duration, as logging
 * the run by hand would; the Activity keeps whatever had been logged by hand on the Session, so
 * unlinking can give it back.
 */
export function linking(activity: Activity, session: Pick<Session, 'id'> & SessionDone): { activity: ActivityLink; session: SessionDone } {
  return {
    activity: { sessionId: session.id, declinedSessionId: null, handLoggedMeters: session.doneMeters, handLoggedSeconds: session.doneSeconds },
    session: { doneMeters: Math.round(activity.distanceMeters), doneSeconds: Math.round(activity.durationSeconds) },
  };
}

/**
 * What unlinking writes. The Activity is an Unplanned Activity again, its Session no longer
 * suggested for it; the Session gets back what had been logged on it by hand before the link,
 * or is no longer done.
 */
export function unlinking(activity: Activity): { activity: ActivityLink; session: SessionDone } {
  return {
    activity: { sessionId: null, declinedSessionId: activity.sessionId, handLoggedMeters: null, handLoggedSeconds: null },
    session: { doneMeters: activity.handLoggedMeters, doneSeconds: activity.handLoggedSeconds },
  };
}
