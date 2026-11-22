import { errorBodySchema, listActivitiesResponseSchema } from '@foulee/contracts';
import { fromSummary, type Activity } from './activity';

/**
 * Client of the BFF (ADR 0005, 0006): `GET /v1/activities`, parsed with the shared contracts so an
 * incompatible BFF fails here instead of writing bad data to the phone.
 */

/** Why an import failed. Each reason gets its own message on screen. */
export type ImportFailure = 'network' | 'unauthorized' | 'garmin_access_expired' | 'unexpected';

export class BffError extends Error {
  constructor(readonly reason: ImportFailure) {
    super(`Garmin import failed: ${reason}`);
  }
}

export type ActivitiesPage = { activities: Activity[]; nextCursor: string | null };

/** Past this, an unreachable BFF (a laptop asleep, a captive Wi-Fi) is reported as a network failure. */
const TIMEOUT_MS = 20_000;

async function request(url: string, token: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { headers: { Accept: 'application/json', Authorization: `Bearer ${token}` }, signal: controller.signal });
  } catch {
    throw new BffError('network');
  } finally {
    clearTimeout(timer);
  }
}

const json = (response: Response): Promise<unknown> => response.json().catch(() => null);

function failureOf(body: unknown): ImportFailure {
  const parsed = errorBodySchema.safeParse(body);
  if (parsed.success && (parsed.data.code === 'unauthorized' || parsed.data.code === 'garmin_access_expired')) return parsed.data.code;
  return 'unexpected';
}

/** Running Activities started after `since` (the cursor the last import returned; `null` the first time). */
export async function fetchActivitiesSince({ bffUrl, token, since }: { bffUrl: string; token: string; since: string | null }): Promise<ActivitiesPage> {
  const query = since === null ? '' : `?since=${encodeURIComponent(since)}`;
  const response = await request(`${bffUrl}/v1/activities${query}`, token);
  const body = await json(response);
  if (!response.ok) throw new BffError(failureOf(body));
  const page = listActivitiesResponseSchema.safeParse(body);
  if (!page.success) throw new BffError('unexpected');
  return { activities: page.data.activities.map(fromSummary), nextCursor: page.data.nextCursor };
}
