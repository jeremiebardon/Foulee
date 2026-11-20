import { router, Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { formatDistance, formatDuration, formatPace } from '@/shared/lib/format';
import { Button, Card, Row, Screen, Txt } from '@/shared/ui/kit';
import { color, space } from '@/shared/ui/theme';
import { isRepeat, KIND_LABEL, stepTotals, workoutTotals, type Step } from './workout';
import { useWorkouts } from './workout.repository';
import { formatTotals, WorkoutSummary } from './WorkoutSummary';

/** Read-only view of a workout: summary, then each step as it will be run. */
export function WorkoutDetailScreen({ id }: { id: string }) {
  const workout = useWorkouts().find((w) => w.id === id);
  if (!workout) return null; // first live-query tick, or just deleted
  const edit = () => router.push(`/workouts/${id}/edit`);
  return (
    <Screen>
      <Stack.Screen options={{ title: workout.name, headerRight: () => <Button icon="create-outline" label="Modifier" variant="ghost" onPress={edit} /> }} />
      <Card>
        <WorkoutSummary workout={workout} />
      </Card>
      <Card>
        <Txt v="h2">Déroulé</Txt>
        {workout.items.map((item, i) =>
          isRepeat(item) ? (
            <View key={i} style={s.repeat}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Txt v="h3" style={{ color: color.accent }}>{item.count} ×</Txt>
                <Txt v="muted">{formatTotals(workoutTotals([item]))}</Txt>
              </Row>
              {item.steps.map((step, j) => <StepRow key={j} step={step} />)}
            </View>
          ) : (
            <StepRow key={i} step={item} />
          ),
        )}
      </Card>
      <Button title="Modifier l’entraînement" icon="create-outline" variant="primary" onPress={edit} />
    </Screen>
  );
}

function StepRow({ step }: { step: Step }) {
  const { meters, seconds } = stepTotals(step);
  const byDistance = step.measure.type === 'distance';
  return (
    <View style={[s.step, { borderLeftColor: step.kind === 'run' ? color.accent : '#a9b9ee' }]}>
      <View style={{ flex: 1 }}>
        <Txt v="label">{KIND_LABEL[step.kind]}</Txt>
        <Txt style={{ fontWeight: '700' }}>
          {byDistance ? formatDistance(meters) : formatDuration(seconds)}
          <Txt v="muted"> {step.pace ? `à ${formatPace(step.pace)}` : 'allure libre'}</Txt>
        </Txt>
      </View>
      <Txt v="muted">≈ {byDistance ? formatDuration(seconds) : formatDistance(Math.round(meters / 10) * 10)}</Txt>
    </View>
  );
}

const s = StyleSheet.create({
  step: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm, paddingLeft: space.md, borderLeftWidth: 4 },
  repeat: { gap: space.sm, padding: space.md, borderRadius: 12, backgroundColor: color.accentSoft },
});
