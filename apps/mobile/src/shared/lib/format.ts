const decimals = (max: number) => new Intl.NumberFormat('fr-CA', { maximumFractionDigits: max });
const pad2 = (n: number) => String(n).padStart(2, '0');

/** 400 → « 400 m », 2000 → « 2 km », 10500 → « 10,5 km ». */
export const formatDistance = (m: number) => (m < 1000 ? `${Math.round(m)} m` : `${decimals(2).format(m / 1000)} km`);

export const formatKm = (m: number, digits = 1) => decimals(digits).format(m / 1000);

/** 240 → « 4:00 ». */
export const formatPaceValue = (secPerKm: number) => {
  const s = Math.round(secPerKm);
  return `${Math.floor(s / 60)}:${pad2(s % 60)}`;
};
export const formatPace = (secPerKm: number) => `${formatPaceValue(secPerKm)}/km`;

/** « 45 s », « 1 min 30 », « 52 min », « 1 h 05 ». */
export function formatDuration(seconds: number): string {
  const s = Math.round(seconds);
  if (s < 60) return `${s} s`;
  if (s < 3600) return s % 60 && s < 600 ? `${Math.floor(s / 60)} min ${pad2(s % 60)}` : `${Math.round(s / 60)} min`;
  const min = Math.round((s % 3600) / 60);
  return min === 60 ? `${Math.floor(s / 3600) + 1} h 00` : `${Math.floor(s / 3600)} h ${pad2(min)}`;
}

/** Stopwatch: « 52:30 » or « 1:05:00 ». */
export function formatClock(seconds: number): string {
  const s = Math.round(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h ? `${h}:${pad2(m)}` : m}:${pad2(s % 60)}`;
}

/** « 52:30 », « 1:05:00 » or « 45 » (minutes) → seconds. */
export function parseClock(text: string): number | null {
  if (!/^\d{1,3}(:\d{1,2}){0,2}$/.test(text.trim())) return null;
  const parts = text.trim().split(':').map(Number);
  if (parts.slice(1).some((p) => p >= 60)) return null;
  const total = parts.length === 1 ? parts[0] * 60 : parts.reduce((acc, p) => acc * 60 + p, 0);
  return total > 0 ? total : null;
}

/** « 4:30 », « 4'30 » or « 5 » → seconds per km, between 2:00 and 15:00. */
export function parsePace(text: string): number | null {
  const m = text.trim().match(/^(\d{1,2})(?:\s*[:'’]\s*(\d{1,2}))?$/);
  if (!m || Number(m[2] ?? 0) >= 60) return null;
  const total = Number(m[1]) * 60 + Number(m[2] ?? 0);
  return total >= 120 && total <= 900 ? total : null;
}

/** « 400 m », « 2 km », « 2,5 » → metres. A bare number under 100 is read as km. */
export function parseDistance(text: string): number | null {
  const m = text.trim().replace(',', '.').match(/^(\d+(?:\.\d+)?)\s*(km|k|m)?$/i);
  if (!m) return null;
  const value = Number(m[1]);
  const unit = m[2]?.toLowerCase() ?? (value < 100 ? 'km' : 'm');
  const meters = Math.round(unit === 'm' ? value : value * 1000);
  return meters > 0 ? meters : null;
}
