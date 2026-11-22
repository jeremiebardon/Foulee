import type { ActivitySummary, ListActivitiesResponse } from '@foulee/contracts';
import { formatUtcOffset, toISO } from '@/shared/lib/dates';

/**
 * E2E builds only: the BFF the Garmin import talks to, inside the app. The e2e reset link turns it
 * on with `bff=stub` (./startup); no e2e run can reach a real BFF or Garmin. It answers
 * `GET <bffUrl>/v1/activities` the way the BFF does, so the app's own client, contract parsing,
 * repository and cursor all run for real; every other request goes to the network as before.
 */

/** `now`'s day at 07:00 on the phone's clock, with the phone's offset, as Garmin reports a start. */
function thisMorning(now: Date): string {
  const sevenAm = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 7);
  return `${toISO(now)}T07:00:00${formatUtcOffset(-sevenAm.getTimezoneOffset())}`;
}

/** What the stub serves: one 6 km run this morning, then nothing new. */
function page(now: Date, since: string | undefined): ListActivitiesResponse {
  const startTime = thisMorning(now);
  const run: ActivitySummary = { garminActivityId: 'e2e-1', startTime, distanceMeters: 6000, durationSeconds: 1980, averagePaceSecondsPerKm: 330, averageHeartRateBpm: 152 };
  const cursor = new Date(startTime).toISOString();
  return since === undefined ?{ activities: [run], nextCursor: cursor } : { activities: [], nextCursor: cursor };
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
