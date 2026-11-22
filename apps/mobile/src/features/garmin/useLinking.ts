import { useMemo } from 'react';
import { useSelectedPlan, useSessionViews } from '@/features/plans';
import type { Activity } from './activity';
import { useActivities } from './activity.repository';
import { linkCandidates, suggestions } from './link';

/** What links Activities to Sessions, read once for a whole list of Activity cards. */
export function useLinking() {
  const activities = useActivities();
  const views = useSessionViews();
  const planId = useSelectedPlan()?.id ?? null;
  return useMemo(() => {
    const suggested = suggestions(activities, views, planId);
    const viewById = new Map(views.map((v) => [v.session.id, v]));
    return {
      activities,
      suggestionFor: (a: Activity) => suggested.get(a.garminActivityId),
      linkedView: (a: Activity) => (a.sessionId === null ? undefined : viewById.get(a.sessionId)),
      candidatesFor: (a: Activity) => linkCandidates(a, activities, views, planId),
    };
  }, [activities, views, planId]);
}
export type Linking = ReturnType<typeof useLinking>;
