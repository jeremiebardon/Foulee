import type { ActivitySummary, ListActivitiesResponse } from '@foulee/contracts';
import { formatUtcOffset, toISO } from '@/shared/lib/dates';

/**
 * E2E builds only: the BFF the Garmin import talks to, inside the app. The e2e reset link turns it
 * on with `bff=stub` (./startup); no e2e run can reach a real BFF or Garmin. It answers
 * `GET <bffUrl>/v1/activities` the way the BFF does, so the app's own client, contract parsing,
 * repository and cursor all run for real; every other request goes to the network as before.
 */

/** 07:00 on `day` on the phone's clock, with the phone's offset that day, as Garmin reports a start. */
function sevenAm(day: Date): string {
  const start = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 7);
  return `${toISO(start)}T07:00:00${formatUtcOffset(-start.getTimezoneOffset())}`;
}

/**
 * The Thursday before `now`'s day: the demo seed (src/db/seed.ts) plans a Session every Thursday,
 * so a run that day always gets a suggestion to confirm or decline, whatever day the flow runs.
 */
function lastThursday(now: Date): Date {
  const daysBack = ((now.getDay() - 4 + 7) % 7) || 7;
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysBack);
}

const summary = (garminActivityId: string, startTime: string, distanceMeters: number, durationSeconds: number): ActivitySummary => ({
  garminActivityId, startTime, distanceMeters, durationSeconds, averagePaceSecondsPerKm: durationSeconds / (distanceMeters / 1000), averageHeartRateBpm: 152,
});

/** What the stub serves, oldest first: a 10 km run last Thursday, a 6 km run this morning, then nothing new. */
function page(now: Date, since: string | undefined): ListActivitiesResponse {
  const thisMorning = sevenAm(now);
  const cursor = new Date(thisMorning).toISOString();
  if (since !== undefined) return { activities: [], nextCursor: cursor };
  return {
    activities: [summary('e2e-thursday', sevenAm(lastThursday(now)), 10000, 3300), summary('e2e-1', thisMorning, 6000, 1980)],
    nextCursor: cursor,
  };
}

export function installBffStub(bffUrl: string, now = new Date()) {
  const network = globalThis.fetch;
  const endpoint = `${bffUrl}/v1/activities`;
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (!url.startsWith(endpoint)) return network(input, init);
    // Not `URL.searchParams`: React Native's URL does not implement all of it.
    const since = /[?&]since=([^&]*)/.exec(url)?.[1];
    return new Response(JSON.stringify(page(now, since)), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
}
