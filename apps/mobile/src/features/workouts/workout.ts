import { formatDistance, formatDuration, formatPace } from '@/shared/lib/format';

// ---- Model -----------------------------------------------------------------
// Workout is an aggregate: its steps are value objects stored with it.

export type StepKind = 'warmup' | 'run' | 'recovery' | 'cooldown';
export type Measure = { type: 'distance'; meters: number } | { type: 'time'; seconds: number };
export type Step = { kind: StepKind; measure: Measure; /** seconds per km, absent = free pace */ pace?: number };
export type RepeatBlock = { kind: 'repeat'; count: number; steps: Step[] };
export type WorkoutItem = Step | RepeatBlock;

export type WorkoutCategory = 'easy' | 'intervals' | 'tempo' | 'long' | 'recovery' | 'race';

export type Workout = { id: string; name: string; category: WorkoutCategory; items: WorkoutItem[] };

export const CATEGORY_LABEL: Record<WorkoutCategory, string> = {
  easy: 'Footing',
  intervals: 'Fractionné',
  tempo: 'Seuil',
  long: 'Sortie longue',
  recovery: 'Récupération',
  race: 'Course',
};

export const KIND_LABEL: Record<StepKind, string> = {
  warmup: 'Échauffement',
  run: 'Course',
  recovery: 'Récup',
  cooldown: 'Retour au calme',
};

export const isRepeat = (item: WorkoutItem): item is RepeatBlock => item.kind === 'repeat';

// ---- Rules -----------------------------------------------------------------

/** Assumed pace when a step has none: only used to convert distance ↔ time for totals. */
export const DEFAULT_PACE: Record<StepKind, number> = { warmup: 360, run: 330, recovery: 390, cooldown: 375 };

export type Totals = { meters: number; seconds: number; /** a step had no target pace */ estimated: boolean };

export function stepTotals({ kind, measure, pace }: Step): Totals {
  const p = pace ?? DEFAULT_PACE[kind];
  return measure.type === 'distance'
    ? { meters: measure.meters, seconds: (measure.meters / 1000) * p, estimated: !pace }
    : { meters: (measure.seconds / p) * 1000, seconds: measure.seconds, estimated: !pace };
}

/** The workout as it will be run: repeats unrolled. */
export const flatten = (items: WorkoutItem[]): Step[] =>
  items.flatMap((item) => (isRepeat(item) ? Array.from({ length: item.count }, () => item.steps).flat() : [item]));

export const workoutTotals = (items: WorkoutItem[]): Totals =>
  flatten(items)
    .map(stepTotals)
    .reduce((a, t) => ({ meters: a.meters + t.meters, seconds: a.seconds + t.seconds, estimated: a.estimated || t.estimated }), {
      meters: 0,
      seconds: 0,
      estimated: false,
    });

const SUFFIX: Record<StepKind, string> = {
  warmup: " d'échauffement",
  run: '',
  recovery: ' de récupération',
  cooldown: ' de retour au calme',
};

export function describeStep({ kind, measure, pace }: Step): string {
  const size = measure.type === 'distance' ? formatDistance(measure.meters) : formatDuration(measure.seconds);
  return `${size}${SUFFIX[kind]}${pace ? ` à ${formatPace(pace)}` : ''}`;
}

/** « 2 × 400 m à 4:00/km + 2 km de retour au calme ». */
export function describeWorkout(items: WorkoutItem[]): string {
  if (!items.length) return 'Aucune étape';
  return items
    .map((item) => {
      if (!isRepeat(item)) return describeStep(item);
      const inner = item.steps.map(describeStep).join(' + ');
      return item.steps.length > 1 ? `${item.count} × (${inner})` : `${item.count} × ${inner}`;
    })
    .join(' + ');
}

/** Problems that block saving; empty when valid. */
export function validateWorkout({ name, items }: Workout): string[] {
  const steps = items.flatMap((i) => (isRepeat(i) ? i.steps : [i]));
  const hasSize = (s: Step) => (s.measure.type === 'distance' ? s.measure.meters : s.measure.seconds) > 0;
  return [
    !name.trim() && 'Donner un nom à l’entraînement.',
    !items.length && 'Ajouter au moins une étape.',
    items.some((i) => isRepeat(i) && (i.count < 1 || !i.steps.length)) && 'Un bloc répété doit avoir au moins 1 répétition et 1 étape.',
    !steps.every(hasSize) && 'Chaque étape doit avoir une distance ou une durée valide.',
  ].filter((e): e is string => !!e);
}
