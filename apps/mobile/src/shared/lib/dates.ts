/** Local calendar date as YYYY-MM-DD. Never a time: avoids timezone drift. */
export type ISODate = string;

const pad = (n: number) => String(n).padStart(2, '0');

export const toISO = (d: Date): ISODate => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function fromISO(iso: ISODate): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export const todayISO = () => toISO(new Date());

export function addDays(iso: ISODate, n: number): ISODate {
  const d = fromISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

/** 0 = Monday … 6 = Sunday. */
export const weekdayIndex = (iso: ISODate) => (fromISO(iso).getDay() + 6) % 7;

export const mondayOf = (iso: ISODate) => addDays(iso, -weekdayIndex(iso));

/** Whole days from `b` to `a` (DST-safe). */
export function diffDays(a: ISODate, b: ISODate): number {
  const utc = (iso: ISODate) => {
    const [y, m, d] = iso.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((utc(a) - utc(b)) / 86_400_000);
}

/** Monday-to-Sunday weeks covering a month (`month`: 0 = January). */
export function monthGrid(year: number, month: number): ISODate[] {
  const last = toISO(new Date(year, month + 1, 0));
  const days: ISODate[] = [];
  for (let d = mondayOf(toISO(new Date(year, month, 1))); d <= last || weekdayIndex(d) !== 0; d = addDays(d, 1)) {
    days.push(d);
  }
  return days;
}

export const DAY_NAMES = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

const fmt = (options: Intl.DateTimeFormatOptions) => {
  const f = new Intl.DateTimeFormat('fr-CA', options);
  return (iso: ISODate) => f.format(fromISO(iso));
};
export const formatShortDate = fmt({ day: 'numeric', month: 'short' });
export const formatLongDate = fmt({ weekday: 'long', day: 'numeric', month: 'long' });
export const formatMonth = fmt({ month: 'long', year: 'numeric' });
