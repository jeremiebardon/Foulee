import { addDays, mondayOf, type ISODate } from '@/shared/lib/dates';
import type { SessionView } from '@/features/plans/plan';

export type WeekVolume = { start: ISODate; planned: number; done: number; current: boolean };

export type DashboardStats = {
  week: { planned: number; done: number; sessionsDone: number; sessionsPlanned: number };
  last28: { meters: number; seconds: number; runs: number; pace: number | null };
  adherence: { done: number; due: number };
  weekly: WeekVolume[];
  next: SessionView | null;
};

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const inRange = (d: ISODate, from: ISODate, to: ISODate) => d >= from && d <= to;
const doneMeters = (v: SessionView) => v.session.doneMeters ?? 0;

/**
 * « Planned » comes from the selected plan, « done » from every session
 * marked done, whatever the plan.
 */
export function computeStats(all: SessionView[], planId: string | null, today: ISODate, weeks = 8): DashboardStats {
  const done = all.filter((v) => v.done);
  const planned = all.filter((v) => v.plan.id === planId);
  const monday = mondayOf(today);
  const thisWeek = (v: SessionView) => inRange(v.date, monday, addDays(monday, 6));
  const recent = done.filter((v) => inRange(v.date, addDays(today, -27), today));
  const meters28 = sum(recent.map(doneMeters));
  const seconds28 = sum(recent.map((v) => v.session.doneSeconds ?? 0));
  const due = planned.filter((v) => v.date < today || (v.date === today && v.done));

  return {
    week: {
      planned: sum(planned.filter(thisWeek).map((v) => v.totals.meters)),
      done: sum(done.filter(thisWeek).map(doneMeters)),
      sessionsDone: planned.filter((v) => thisWeek(v) && v.done).length,
      sessionsPlanned: planned.filter(thisWeek).length,
    },
    last28: { meters: meters28, seconds: seconds28, runs: recent.length, pace: meters28 ? seconds28 / (meters28 / 1000) : null },
    adherence: { done: due.filter((v) => v.done).length, due: due.length },
    weekly: Array.from({ length: weeks }, (_, i) => {
      const start = addDays(monday, (i - weeks + 1) * 7);
      const within = (v: SessionView) => inRange(v.date, start, addDays(start, 6));
      return {
        start,
        planned: sum(planned.filter(within).map((v) => v.totals.meters)),
        done: sum(done.filter(within).map(doneMeters)),
        current: start === monday,
      };
    }),
    next: planned.find((v) => v.date >= today && !v.done) ?? null,
  };
}

/** Round axis ceiling, in km: 37 → 40, 12 → 15. */
export const niceCeil = (km: number) => [5, 10, 15, 20, 30, 40, 50, 60, 80, 100, 150, 200].find((s) => s >= km) ?? Math.ceil(km / 50) * 50;
