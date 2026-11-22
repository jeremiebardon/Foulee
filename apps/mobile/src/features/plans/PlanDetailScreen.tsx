import { router, Stack } from 'expo-router';
import { addDays, DAY_NAMES, diffDays, formatShortDate, todayISO } from '@/shared/lib/dates';
import { formatKm } from '@/shared/lib/format';
import { Button, Card, Row, Screen, Txt } from '@/shared/ui/kit';
import { color } from '@/shared/ui/theme';
import { planEnd, weeklyVolumes, weekStart } from './plan';
import { selectPlan, usePlans, useSessionViews } from './plan.repository';
import { VolumeBars } from './PlanListScreen';
import { SessionRow } from './SessionRow';

/** Read-only overview of a plan, week by week. Tapping a session opens its workout. */
export function PlanDetailScreen({ id }: { id: string }) {
  const plan = usePlans().find((p) => p.id === id);
  const views = useSessionViews().filter((v) => v.plan.id === id);
  if (!plan) return null; // first live-query tick, or just deleted

  const volumes = weeklyVolumes(plan, views);
  const current = Math.floor(diffDays(todayISO(), plan.startDate) / 7);
  const edit = () => router.push(`/plans/${id}/edit`);
  return (
    <Screen testID="plan-detail">
      <Stack.Screen options={{ title: plan.name, headerRight: () => <Button icon="create-outline" label="Modifier" variant="ghost" onPress={edit} /> }} />
      <Card>
        <Txt v="muted">{formatShortDate(plan.startDate)} → {formatShortDate(planEnd(plan))} · {plan.weeks} semaines</Txt>
        <Txt testID="plan-detail-summary" v="big">
          {formatKm(volumes.reduce((a, b) => a + b, 0), 0)}<Txt v="muted"> km · {views.filter((v) => v.done).length}/{views.length} séances faites</Txt>
        </Txt>
        <VolumeBars volumes={volumes} max={Math.max(1, ...volumes)} current={current} />
        <Row>
          <Button testID="plan-edit" title="Modifier le plan" icon="create-outline" variant="primary" onPress={edit} />
          {plan.selected ? <Txt testID="plan-detail-selected" v="label" style={{ color: color.accent }}>Affiché dans le calendrier</Txt> : <Button testID="plan-detail-select" title="Afficher dans le calendrier" onPress={() => selectPlan(id)} />}
        </Row>
      </Card>

      {volumes.map((meters, week) => {
        const start = weekStart(plan, week);
        const ofWeek = views.filter((v) => v.session.week === week);
        return (
          <Card key={week} style={week === current ? { borderColor: color.accent } : undefined}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Txt v="h3">Semaine {week + 1}</Txt>
              <Txt v="muted">{formatShortDate(start)} → {formatShortDate(addDays(start, 6))} · {formatKm(meters)} km</Txt>
            </Row>
            {ofWeek.length === 0 && <Txt v="muted">Semaine de repos</Txt>}
            {ofWeek.map((v) => (
              <SessionRow key={v.session.id} testID={`plan-week-${week}-session`} view={v} prefix={`${DAY_NAMES[v.session.day]} ${formatShortDate(v.date)}`} onPress={() => router.push(`/workouts/${v.workout.id}`)} />
            ))}
          </Card>
        );
      })}
    </Screen>
  );
}
