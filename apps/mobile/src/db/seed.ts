import { addDays, mondayOf, todayISO } from '@/shared/lib/dates';
import { newId } from '@/shared/lib/id';
import { sessionDate, type Plan } from '@/features/plans/domain';
import { workoutTotals, type Step, type StepKind, type Workout } from '@/features/workouts/domain';
import { db } from './client';
import { plans, sessions, workouts } from './schema';

const km = (kind: StepKind, meters: number, pace?: number): Step => ({ kind, measure: { type: 'distance', meters }, pace });
const min = (kind: StepKind, seconds: number, pace?: number): Step => ({ kind, measure: { type: 'time', seconds }, pace });

/** Example content so a first launch has something to show. Started 5 weeks ago, past sessions mostly done. */
export function seedDemo(today = todayISO()) {
  const w = (name: string, category: Workout['category'], items: Workout['items']): Workout => ({ id: newId(), name, category, items });
  const list = [
    w('VMA 10 × 400 m', 'intervals', [km('warmup', 2000, 360), { kind: 'repeat', count: 10, steps: [km('run', 400, 230), min('recovery', 60)] }, km('cooldown', 2000, 375)]),
    w('2 × 400 m + retour au calme', 'intervals', [{ kind: 'repeat', count: 2, steps: [km('run', 400, 240)] }, km('cooldown', 2000)]),
    w('Seuil 3 × 2 km', 'tempo', [min('warmup', 900, 360), { kind: 'repeat', count: 3, steps: [km('run', 2000, 265), min('recovery', 120)] }, min('cooldown', 600, 375)]),
    w('Récupération 5 km', 'recovery', [km('run', 5000, 375)]),
    w('Sortie longue 16 km', 'long', [km('run', 16000, 350)]),
  ];
  const plan: Plan = { id: newId(), name: 'Objectif 10 km', startDate: addDays(mondayOf(today), -35), weeks: 10, selected: true };
  const rows = Array.from({ length: plan.weeks }, (_, week) =>
    ([[1, week % 2 ? 1 : 0], [3, 2], [5, 3], [6, 4]] as const).map(([day, i]) => {
      const date = sessionDate(plan, { week, day });
      const t = workoutTotals(list[i].items);
      const done = date < today && (week * 7 + day) % 9 !== 4; // a few skipped sessions
      const drift = 0.97 + ((week + day) % 5) / 100;
      return {
        id: newId(), planId: plan.id, workoutId: list[i].id, week, day,
        doneMeters: done ? Math.round((t.meters * drift) / 10) * 10 : null,
        doneSeconds: done ? Math.round(t.seconds * drift) : null,
      };
    }),
  ).flat();

  db.transaction((tx) => {
    tx.update(plans).set({ selected: false }).run();
    tx.insert(workouts).values(list).run();
    tx.insert(plans).values(plan).run();
    tx.insert(sessions).values(rows).run();
  });
}
