import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { addDays, DAY_NAMES, diffDays, formatShortDate, mondayOf, todayISO } from '@/shared/lib/dates';
import { formatDistance } from '@/shared/lib/format';
import { Button, Card, confirm, Field, Row, Screen, Sheet, Stepper, Txt } from '@/shared/ui/kit';
import { color, space } from '@/shared/ui/theme';
import { useWorkouts, WorkoutSummary } from '@/features/workouts';
import { weeklyVolumes, weekStart, type Plan } from '../domain/plan';
import { addSession, copyPlanWeek, deletePlan, removeSession, selectPlan, updatePlan, usePlans, useSessionViews } from '../data/plan.repository';
import { VolumeBars } from './PlanListScreen';
import { SessionRow } from '../components/SessionRow';

export function PlanEditorScreen({ id }: { id: string }) {
  const plan = usePlans().find((p) => p.id === id);
  return plan ? <Editor plan={plan} /> : null; // null until the live query's first result
}

function Editor({ plan }: { plan: Plan }) {
  const views = useSessionViews().filter((v) => v.plan.id === plan.id);
  const [week, setWeek] = useState(() => Math.max(0, Math.min(plan.weeks - 1, Math.floor(diffDays(todayISO(), plan.startDate) / 7))));
  const [pickDay, setPickDay] = useState<number | null>(null);

  const current = Math.min(week, plan.weeks - 1);
  const volumes = weeklyVolumes(plan, views);
  const start = weekStart(plan, current);
  const thisMonday = mondayOf(todayISO());
  const remove = () =>
    confirm('Supprimer ce plan ?', 'Ses séances seront supprimées. Les entraînements restent disponibles.', 'Supprimer', () => {
      deletePlan(plan.id);
      router.dismissTo('/plans');
    });

  return (
    <Screen testID="plan-editor">
      <Stack.Screen options={{ title: 'Modifier le plan' }} />
      <Card>
        <Field testID="plan-name" label="Nom du plan" defaultValue={plan.name} onChangeText={(name) => updatePlan(plan.id, { name })} />
        <Row style={{ alignItems: 'flex-start' }}>
          <Stepper testID="plan-start" label="Début" min={-52} max={52} value={diffDays(plan.startDate, thisMonday) / 7}
            format={(w) => `lun. ${formatShortDate(addDays(thisMonday, w * 7))}`}
            onChange={(w) => updatePlan(plan.id, { startDate: addDays(thisMonday, w * 7) })} />
          <Stepper testID="plan-weeks" label="Semaines" min={1} max={52} value={plan.weeks} onChange={(weeks) => updatePlan(plan.id, { weeks })} />
        </Row>
        <Row>
          {plan.selected ? <Txt testID="plan-selected" v="label" style={{ color: color.accent }}>Plan affiché dans le calendrier</Txt> : <Button testID="plan-select" title="Afficher dans le calendrier" onPress={() => selectPlan(plan.id)} />}
          <Button testID="plan-delete" title="Supprimer" icon="trash-outline" variant="danger" onPress={remove} />
        </Row>
      </Card>

      <Card>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.xs }}>
          {volumes.map((v, i) => (
            <Pressable key={i} accessibilityRole="tab" accessibilityState={{ selected: i === current }} onPress={() => setWeek(i)} style={[s.week, i === current && s.weekOn]}>
              <VolumeBars volumes={[v]} max={Math.max(1, ...volumes)} current={i === current ? 0 : -1} />
              <Txt v="label" style={i === current && { color: color.accent }}>S{i + 1}</Txt>
            </Pressable>
          ))}
        </ScrollView>
        <Txt testID="plan-week-title" v="h2">Semaine {current + 1}</Txt>
        <Txt v="muted">
          {formatShortDate(start)} → {formatShortDate(addDays(start, 6))} · {formatDistance(Math.round(volumes[current] / 100) * 100)}
        </Txt>
        {current < plan.weeks - 1 && (
          <Row>
            <Button testID="plan-copy-next" title={`Copier vers S${current + 2}`} icon="copy-outline" onPress={() => copyPlanWeek(plan.id, current, [current + 1])} />
            <Button testID="plan-copy-rest" title="Copier vers la suite" icon="repeat" onPress={() => copyPlanWeek(plan.id, current, volumes.map((_, i) => i).filter((i) => i > current))} />
          </Row>
        )}
      </Card>

      {DAY_NAMES.map((name, day) => (
        <View key={day} style={s.day}>
          <View style={{ width: 84 }}>
            <Txt style={{ fontWeight: '700' }}>{name}</Txt>
            <Txt v="muted">{formatShortDate(addDays(start, day))}</Txt>
          </View>
          <View style={{ flex: 1, gap: space.sm }}>
            {views.filter((v) => v.session.week === current && v.session.day === day).map((v) => (
              <SessionRow key={v.session.id} testID={`plan-day-${day}-session`} view={v}
                action={<Button testID="plan-session-remove" icon="close" label={`Retirer ${v.workout.name}`} variant="ghost" onPress={() => removeSession(v.session.id)} />} />
            ))}
            <Button testID={`plan-day-${day}-add`} title="Ajouter" icon="add" variant="ghost" onPress={() => setPickDay(day)} />
          </View>
        </View>
      ))}

      {pickDay !== null && <PickWorkoutSheet plan={plan} week={current} day={pickDay} onClose={() => setPickDay(null)} />}
    </Screen>
  );
}

/** Picks the workout to add on one day of the week being edited. */
function PickWorkoutSheet({ plan, week, day, onClose }: { plan: Plan; week: number; day: number; onClose(): void }) {
  const workouts = useWorkouts();
  return (
    <Sheet testID="plan-pick-sheet" visible title={`${DAY_NAMES[day]} · semaine ${week + 1}`} onClose={onClose}>
      {workouts.length === 0 && <Button testID="plan-pick-create-workout" title="Créer un entraînement" variant="primary" onPress={() => { onClose(); router.push('/workouts/new'); }} />}
      {workouts.map((w) => (
        <Pressable key={w.id} testID="plan-pick-workout" accessibilityRole="button" style={s.pick}
          onPress={() => { addSession({ planId: plan.id, workoutId: w.id, week, day }); onClose(); }}>
          <WorkoutSummary workout={w} />
        </Pressable>
      ))}
    </Sheet>
  );
}

const s = StyleSheet.create({
  week: { width: 48, gap: 4, padding: 6, alignItems: 'center', borderRadius: 8, borderWidth: 1, borderColor: 'transparent' },
  weekOn: { borderColor: color.accent, backgroundColor: color.accentSoft },
  day: { flexDirection: 'row', gap: space.md, padding: space.md, borderRadius: 12, backgroundColor: color.surface2, borderWidth: 1, borderColor: color.line },
  pick: { padding: space.md, borderRadius: 12, borderWidth: 1, borderColor: color.line },
});
