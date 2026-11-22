import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { formatShortDate } from '@/shared/lib/dates';
import { formatKm } from '@/shared/lib/format';
import { Button, Card, Empty, Row, Screen, Txt } from '@/shared/ui/kit';
import { color } from '@/shared/ui/theme';
import { planEnd, weeklyVolumes } from '../domain/plan';
import { createPlan, usePlans, useSessionViews } from '../data/plan.repository';

export function PlanListScreen() {
  const plans = usePlans();
  const views = useSessionViews();
  return (
    <Screen testID="plan-list">
      <Button testID="plan-new" title="Nouveau plan" icon="add" variant="primary" onPress={() => router.push(`/plans/${createPlan()}/edit`)} />
      {plans.length === 0 && <Empty title="Aucun plan" text="Un plan répartit des entraînements sur plusieurs semaines, jour par jour." />}
      {plans.map((plan) => {
        const volumes = weeklyVolumes(plan, views);
        const max = Math.max(1, ...volumes);
        return (
          <Pressable key={plan.id} testID="plan-item" accessibilityRole="button" onPress={() => router.push(`/plans/${plan.id}`)}>
            <Card>
              <Row style={{ justifyContent: 'space-between' }}>
                <Txt testID="plan-item-name" v="h2">{plan.name}</Txt>
                {plan.selected && <Txt testID="plan-item-selected" v="label" style={{ color: color.accent }}>Sélectionné</Txt>}
              </Row>
              <Txt v="muted">
                {formatShortDate(plan.startDate)} → {formatShortDate(planEnd(plan))} · {plan.weeks} sem. · {formatKm(volumes.reduce((a, b) => a + b, 0), 0)} km
              </Txt>
              <VolumeBars volumes={volumes} max={max} />
            </Card>
          </Pressable>
        );
      })}
    </Screen>
  );
}

export const VolumeBars = ({ volumes, max, current }: { volumes: number[]; max: number; current?: number }) => (
  <View style={{ flexDirection: 'row', alignItems: 'flex-end', alignSelf: 'stretch', gap: 3, height: 40 }}>
    {volumes.map((v, i) => (
      <View key={i} style={{ flex: 1, maxWidth: 28, height: `${Math.max(6, (v / max) * 100)}%`, borderRadius: 2, backgroundColor: i === current ? color.accent : '#a9b9ee' }} />
    ))}
  </View>
);
