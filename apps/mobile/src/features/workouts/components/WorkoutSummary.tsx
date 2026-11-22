import { Link } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { formatDistance, formatDuration } from '@/shared/lib/format';
import { Row, Txt } from '@/shared/ui/kit';
import { color } from '@/shared/ui/theme';
import { CATEGORY_LABEL, DEFAULT_PACE, describeWorkout, flatten, stepTotals, workoutTotals, type Totals, type Workout, type WorkoutCategory, type WorkoutItem } from '../domain/workout';

export const CATEGORY_COLOR: Record<WorkoutCategory, string> = {
  easy: '#23875a',
  intervals: '#d1402f',
  tempo: '#b86f0c',
  long: '#6a4bd6',
  recovery: '#14818d',
  race: '#101a2b',
};

export const CategoryTag = ({ category }: { category: WorkoutCategory }) => (
  <Row style={{ gap: 6 }}>
    <View style={[s.dot, { backgroundColor: CATEGORY_COLOR[category] }]} />
    <Txt v="label">{CATEGORY_LABEL[category]}</Txt>
  </Row>
);

/** « 9,6 km · 52 min », prefixed with ≈ when a free-pace step made it an estimate. */
export const formatTotals = ({ meters, seconds, estimated }: Totals) =>
  seconds ? `${estimated ? '≈ ' : ''}${formatDistance(Math.round(meters / 10) * 10)} · ${formatDuration(seconds)}` : '—';

/** Session shape at a glance: one bar per step, as wide as its duration, as tall as its intensity. */
export function WorkoutProfile({ items, height = 44 }: { items: WorkoutItem[]; height?: number }) {
  return (
    <View style={[s.profile, { height }]} accessibilityLabel="Profil de la séance">
      {flatten(items).map((step, i) => {
        const intensity = Math.min(1, Math.max(0.22, (450 - (step.pace ?? DEFAULT_PACE[step.kind])) / 240));
        const easy = step.kind !== 'run';
        return (
          <View
            key={i}
            style={{ flex: Math.max(1, stepTotals(step).seconds), height: `${intensity * 100}%`, borderTopLeftRadius: 3, borderTopRightRadius: 3, backgroundColor: easy ? '#a9b9ee' : color.accent }}
          />
        );
      })}
    </View>
  );
}

/**
 * Tag, name, profile, description and totals: the same block on every screen that shows a workout.
 * With `link`, pressing it opens the workout's detail.
 */
export function WorkoutSummary({ workout, link }: { workout: Workout; link?: boolean }) {
  const body = (
    <View style={{ gap: 8 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <CategoryTag category={workout.category} />
        {link && <Txt v="label" style={{ color: color.accent }}>Détail ›</Txt>}
      </Row>
      <Txt testID="workout-summary-name" v="h3">{workout.name}</Txt>
      <WorkoutProfile items={workout.items} />
      <Txt v="muted">{describeWorkout(workout.items)}</Txt>
      <Txt testID="workout-summary-totals" style={{ fontWeight: '700' }}>{formatTotals(workoutTotals(workout.items))}</Txt>
    </View>
  );
  return link ? <Link href={`/workouts/${workout.id}`} asChild><Pressable testID="workout-summary-link" accessibilityRole="button">{body}</Pressable></Link> : body;
}

const s = StyleSheet.create({
  dot: { width: 10, height: 10, borderRadius: 3 },
  profile: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, borderBottomWidth: 2, borderBottomColor: color.line },
});
