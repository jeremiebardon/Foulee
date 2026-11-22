import { addDays, mondayOf, type ISODate } from '@/shared/lib/dates';
import { workoutTotals, type Totals, type Workout } from '@/features/workouts/domain';

// ---- Model -----------------------------------------------------------------

export type Plan = { id: string; name: string; /** always a Monday */ startDate: ISODate; weeks: number; selected: boolean };

/** What was actually run on a session. */
export type DoneRun = { meters: number; seconds: number };

/**
 * A workout placed on one day of a plan, plus what was actually run, as stored: both done fields
 * are set, or both are null. Read them through SessionView.done, which holds them together.
 */
export type Session = {
  id: string;
  planId: string;
  workoutId: string;
  /** 0 = first week of the plan */
  week: number;
  /** 0 = Monday … 6 = Sunday */
  day: number;
  doneMeters: number | null;
  doneSeconds: number | null;
};

/** Read model: a session resolved against its plan and workout. */
export type SessionView = { session: Session; plan: Plan; workout: Workout; date: ISODate; totals: Totals; done: DoneRun | null };

/** What was run on a session, or null while it is not done (a lone distance or time does not count). */
export const doneRun = ({ doneMeters, doneSeconds }: Session): DoneRun | null =>
  doneMeters !== null && doneSeconds !== null ? { meters: doneMeters, seconds: doneSeconds } : null;

// ---- Rules -----------------------------------------------------------------

export const normalizeStart = (iso: ISODate) => mondayOf(iso);
export const weekStart = (plan: Plan, week: number) => addDays(plan.startDate, week * 7);
export const planEnd = (plan: Plan) => addDays(plan.startDate, plan.weeks * 7 - 1);
export const sessionDate = (plan: Plan, s: Pick<Session, 'week' | 'day'>) => addDays(plan.startDate, s.week * 7 + s.day);

/** Joins rows from three tables; drops sessions outside the plan's current length. */
export function toSessionViews(plans: Plan[], sessions: Session[], workouts: Workout[]): SessionView[] {
  const planById = new Map(plans.map((p) => [p.id, p]));
  const workoutById = new Map(workouts.map((w) => [w.id, w]));
  return sessions
    .flatMap((session) => {
      const plan = planById.get(session.planId);
      const workout = workoutById.get(session.workoutId);
      if (!plan || !workout || session.week >= plan.weeks) return [];
      return [{ session, plan, workout, date: sessionDate(plan, session), totals: workoutTotals(workout.items), done: doneRun(session) }];
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Planned metres for each week of a plan. */
export function weeklyVolumes(plan: Plan, views: SessionView[]): number[] {
  const volumes = Array<number>(plan.weeks).fill(0);
  for (const v of views) if (v.plan.id === plan.id) volumes[v.session.week] += v.totals.meters;
  return volumes;
}

/** Sessions of week `from` copied onto `targets` (target content is replaced by the caller). */
export const copyWeek = (sessions: Session[], from: number, targets: number[]): Omit<Session, 'id'>[] =>
  targets.flatMap((week) =>
    sessions
      .filter((s) => s.week === from)
      .map(({ planId, workoutId, day }) => ({ planId, workoutId, day, week, doneMeters: null, doneSeconds: null })),
  );
