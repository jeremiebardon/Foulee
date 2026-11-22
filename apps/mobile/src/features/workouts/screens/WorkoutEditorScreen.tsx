import { router, Stack } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { formatClock, formatDistance, formatPaceValue, parseClock, parseDistance, parsePace } from '@/shared/lib/format';
import { newId } from '@/shared/lib/id';
import { Button, Card, Chips, confirm, Field, ParsedField, Row, Screen, Stepper, Txt } from '@/shared/ui/kit';
import { color, radius, space } from '@/shared/ui/theme';
import { CATEGORY_LABEL, KIND_LABEL, describeWorkout, isRepeat, validateWorkout, workoutTotals, type RepeatBlock, type Step, type Workout } from '../domain/workout';
import { deleteWorkout, saveWorkout, useWorkouts } from '../data/workout.repository';
import { formatTotals, WorkoutProfile } from '../components/WorkoutSummary';

const newStep = (): Step => ({ kind: 'run', measure: { type: 'distance', meters: 1000 } });
const newRepeat = (): RepeatBlock => ({
  kind: 'repeat',
  count: 4,
  steps: [{ kind: 'run', measure: { type: 'distance', meters: 400 } }, { kind: 'recovery', measure: { type: 'time', seconds: 60 } }],
});

/** `id` is a workout id, or « new ». */
export function WorkoutEditorScreen({ id }: { id: string }) {
  const workouts = useWorkouts();
  const [blank] = useState<Workout>(() => ({ id: newId(), name: '', category: 'easy', items: [] }));
  const initial = id === 'new' ? blank : workouts.find((w) => w.id === id);
  return initial ? <Editor initial={initial} isNew={id === 'new'} /> : null; // null until the live query's first result
}

function Editor({ initial, isNew }: { initial: Workout; isNew: boolean }) {
  const [draft, setDraft] = useState(initial);
  const [errors, setErrors] = useState<string[]>([]);
  // List keys are indexes; bumping `rev` after a structural edit remounts inputs so their text never goes stale.
  const [rev, setRev] = useState(0);
  const setItems: ListChange<Workout['items'][number]> = (items, structural) => {
    setDraft((d) => ({ ...d, items }));
    if (structural) setRev((r) => r + 1);
  };

  const save = () => {
    const found = validateWorkout(draft);
    setErrors(found);
    if (found.length) return;
    saveWorkout({ ...draft, name: draft.name.trim() });
    router.back();
  };
  const remove = () =>
    confirm('Supprimer cet entraînement ?', 'Il sera aussi retiré de tous les plans.', 'Supprimer', () => {
      deleteWorkout(draft.id);
      router.dismissTo('/workouts');
    });

  return (
    <Screen testID="workout-editor">
      <Stack.Screen options={{ title: isNew ? 'Nouvel entraînement' : draft.name || 'Entraînement' }} />
      <Card>
        <Field testID="workout-name" label="Nom" value={draft.name} placeholder="VMA 10 × 400 m" onChangeText={(name) => setDraft({ ...draft, name })} />
        <Txt v="label">Type de séance</Txt>
        <Chips testID="workout-category" options={CATEGORY_LABEL} value={draft.category} onChange={(category) => setDraft({ ...draft, category })} />
      </Card>

      <Txt v="h2">Étapes</Txt>
      <EditableList
        items={draft.items}
        rev={rev}
        onChange={setItems}
        render={(item, update) =>
          isRepeat(item) ? (
            <View style={{ gap: space.md }}>
              <Txt v="label" style={{ color: color.accent }}>BLOC RÉPÉTÉ</Txt>
              <Stepper testID="workout-repeat-count" label="Répétitions" value={item.count} onChange={(count) => update({ ...item, count })} />
              <EditableList
                items={item.steps}
                rev={rev}
                nested
                onChange={(steps, structural) => update({ ...item, steps }, structural)}
                render={(step, updateStep) => <StepEditor step={step} onChange={updateStep} />}
              />
              <Button testID="workout-repeat-add-step" title="Ajouter une étape au bloc" icon="add" variant="ghost" onPress={() => update({ ...item, steps: [...item.steps, newStep()] }, true)} />
            </View>
          ) : (
            <StepEditor step={item} onChange={update} />
          )
        }
      />
      <Row>
        <Button testID="workout-add-step" title="Étape" icon="add" onPress={() => setItems([...draft.items, newStep()], true)} />
        <Button testID="workout-add-repeat" title="Bloc répété" icon="repeat" onPress={() => setItems([...draft.items, newRepeat()], true)} />
      </Row>

      <Card style={{ borderColor: color.accent }}>
        <Txt v="h2">Aperçu</Txt>
        <WorkoutProfile items={draft.items} />
        <Txt>{describeWorkout(draft.items)}</Txt>
        <Txt testID="workout-totals" v="big">{formatTotals(workoutTotals(draft.items))}</Txt>
        {errors.map((e) => <Txt key={e} testID="workout-error" v="error">{e}</Txt>)}
        <Row>
          <Button testID="workout-save" title="Enregistrer" variant="primary" onPress={save} />
          {!isNew && <Button testID="workout-delete" title="Supprimer" icon="trash-outline" variant="danger" onPress={remove} />}
        </Row>
      </Card>
    </Screen>
  );
}

type ListChange<T> = (items: T[], structural?: boolean) => void;

/** Ordered list with move up / move down / remove: used for steps and for the steps of a repeat block. */
function EditableList<T>({ items, rev, nested, onChange, render }: {
  items: T[]; rev: number; nested?: boolean; onChange: ListChange<T>; render(item: T, update: (v: T, structural?: boolean) => void): ReactNode;
}) {
  const replace = (i: number, v: T) => items.map((x, j) => (j === i ? v : x));
  const swap = (i: number, j: number) => onChange(replace(j, items[i]).map((x, k) => (k === i ? items[j] : x)), true);
  return items.map((item, i) => (
    <View key={`${rev}-${i}`} style={{ gap: space.sm, padding: space.md, borderRadius: radius, borderWidth: 1, borderColor: color.line, backgroundColor: nested ? color.surface2 : color.surface }}>
      {render(item, (v, structural) => onChange(replace(i, v), structural))}
      <Row style={{ justifyContent: 'flex-end', gap: 0 }}>
        <Button icon="arrow-up" label="Monter" variant="ghost" disabled={i === 0} onPress={() => swap(i, i - 1)} />
        <Button icon="arrow-down" label="Descendre" variant="ghost" disabled={i === items.length - 1} onPress={() => swap(i, i + 1)} />
        <Button icon="trash-outline" label="Supprimer l’étape" variant="ghost" onPress={() => onChange(items.filter((_, j) => j !== i), true)} />
      </Row>
    </View>
  ));
}

function StepEditor({ step, onChange }: { step: Step; onChange(s: Step, structural?: boolean): void }) {
  const { measure } = step;
  const setType = (type: 'distance' | 'time') =>
    onChange({ ...step, measure: type === 'distance' ? { type, meters: 1000 } : { type, seconds: 300 } }, true);
  return (
    <>
      <Chips testID="step-kind" options={KIND_LABEL} value={step.kind} onChange={(kind) => onChange({ ...step, kind })} />
      <Chips testID="step-measure" options={{ distance: 'Distance', time: 'Durée' }} value={measure.type} onChange={setType} />
      <Row style={{ alignItems: 'flex-start' }}>
        {measure.type === 'distance' ? (
          <ParsedField testID="step-distance" label="Distance" value={measure.meters} format={formatDistance} parse={parseDistance} invalidText="Ex. : 400 m, 2 km"
            onChange={(meters = 0) => onChange({ ...step, measure: { type: 'distance', meters } })} />
        ) : (
          <ParsedField testID="step-duration" label="Durée (min:s)" value={measure.seconds} format={formatClock} parse={parseClock} invalidText="Ex. : 1:30, 10:00" keyboardType="numbers-and-punctuation"
            onChange={(seconds = 0) => onChange({ ...step, measure: { type: 'time', seconds } })} />
        )}
        <ParsedField testID="step-pace" label="Allure cible (/km)" placeholder="libre" value={step.pace} format={formatPaceValue} parse={parsePace} invalidText="Ex. : 4:30" keyboardType="numbers-and-punctuation"
          onChange={(pace) => onChange({ ...step, pace })} />
      </Row>
    </>
  );
}
