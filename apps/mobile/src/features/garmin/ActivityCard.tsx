import { useMemo, useState } from 'react';
import { formatLongDate } from '@/shared/lib/dates';
import { formatDistance, formatDuration, formatPace } from '@/shared/lib/format';
import { Button, Card, Row, Sheet, Txt } from '@/shared/ui/kit';
import { color } from '@/shared/ui/theme';
import { SessionRow, useSelectedPlan, useSessionViews, type SessionView } from '@/features/plans';
import { activityDate, type Activity } from './activity';
import { declineSuggestion, linkActivity, unlinkActivity, useActivities } from './activity.repository';
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

/**
 * An imported run and its link to the plan: the Session it completes, with a way to unlink it, or,
 * for an Unplanned Activity, the Session planned that day to confirm or decline, and any Session
 * of the selected Plan to pick by hand.
 */
export function ActivityCard({ activity, linking }: { activity: Activity; linking: Linking }) {
  const [picking, setPicking] = useState(false);
  const details = [formatDistance(activity.distanceMeters), formatDuration(activity.durationSeconds), formatPace(activity.averagePaceSecondsPerKm)];
  if (activity.averageHeartRateBpm !== null) details.push(`${activity.averageHeartRateBpm} bpm`);
  const suggestion = linking.suggestionFor(activity);
  const linked = linking.linkedView(activity);

  return (
    <Card testID={`garmin-activity-${activity.garminActivityId}`}>
      <Txt v="h3">{formatLongDate(activityDate(activity))}</Txt>
      <Txt v="muted">{details.join(' · ')}</Txt>
      {activity.sessionId !== null ? (
        <>
          <Txt testID="activity-linked" style={{ color: color.ok, fontWeight: '700' }}>
            {linked ? `✓ ${linked.workout.name} · ${formatLongDate(linked.date)}` : '✓ Liée à une séance qui n’est plus dans le plan'}
          </Txt>
          <Button testID="activity-unlink" title="Délier" variant="ghost" onPress={() => unlinkActivity(activity)} />
        </>
      ) : (
        <>
          <Txt testID="activity-unplanned" v="label">Activité non planifiée</Txt>
          {suggestion && (
            <>
              <Txt testID="activity-suggestion">Séance prévue ce jour : {suggestion.workout.name}</Txt>
              <Row>
                <Button testID="activity-confirm-link" title="Lier à cette séance" icon="link" variant="primary" onPress={() => linkActivity(activity, suggestion.session.id)} />
                <Button testID="activity-decline-link" title="Refuser" variant="ghost" onPress={() => declineSuggestion(activity, suggestion.session.id)} />
              </Row>
            </>
          )}
          <Button testID="activity-link-manual" title="Choisir une séance" onPress={() => setPicking(true)} />
        </>
      )}
      {picking && <PickSessionSheet activity={activity} candidates={linking.candidatesFor(activity)} onClose={() => setPicking(false)} />}
    </Card>
  );
}

function PickSessionSheet({ activity, candidates, onClose }: { activity: Activity; candidates: SessionView[]; onClose(): void }) {
  return (
    <Sheet testID="activity-link-sheet" visible title="Lier à une séance" onClose={onClose}>
      {candidates.length === 0 && <Txt v="muted">Aucune séance à lier dans le plan sélectionné.</Txt>}
      {candidates.map((view) => (
        <SessionRow
          key={view.session.id}
          testID="activity-link-candidate"
          view={view}
          prefix={formatLongDate(view.date)}
          onPress={() => {
            linkActivity(activity, view.session.id);
            onClose();
          }}
        />
      ))}
    </Sheet>
  );
}
