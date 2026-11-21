/** What a Garmin activity was, in Foulée's vocabulary (not Garmin's type keys). */
export const ACTIVITY_KINDS = [
  'running',
  'trail_running',
  'treadmill_running',
  'track_running',
  'cycling',
  'swimming',
  'walking',
  'hiking',
  'strength',
  'other',
] as const;

export type ActivityKind = (typeof ACTIVITY_KINDS)[number];

const RUNNING_KINDS: readonly ActivityKind[] = ['running', 'trail_running', 'treadmill_running', 'track_running'];

/** Only running Activities are imported. */
export function isRunning(kind: ActivityKind): boolean {
  return RUNNING_KINDS.includes(kind);
}
