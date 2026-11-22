import { errorBodySchema, listActivitiesResponseSchema } from '@foulee/contracts';
import { services } from '@/shared/services';
import type { HttpResponse } from '@/shared/services/http/HttpClient';
import { fromSummary, type Activity } from '../domain/activity';
import type { BffAccess } from '../domain/bffAccess';

/**
 * The BFF's API (ADR 0005, 0006), reached through the HTTP service: `GET /v1/activities`, parsed with
 * the shared contracts so an incompatible BFF fails here instead of writing bad data to the phone.
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

async function request(url: string, { token }: BffAccess): Promise<HttpResponse> {
  try {
    return await services.http.request({
      method: 'GET',
      url,
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
      timeoutMs: TIMEOUT_MS,
    });
  } catch {
    throw new BffError('network');
  }
}

function failureOf(body: unknown): ImportFailure {
  const parsed = errorBodySchema.safeParse(body);
  if (parsed.success && (parsed.data.code === 'unauthorized' || parsed.data.code === 'garmin_access_expired')) return parsed.data.code;
  return 'unexpected';
}

/** Running Activities started after `since` (the cursor the last import returned; `null` the first time). */
export async function fetchActivitiesSince(access: BffAccess, since: string | null): Promise<ActivitiesPage> {
  const query = since === null ? '' : `?since=${encodeURIComponent(since)}`;
  const response = await request(`${access.bffUrl}/v1/activities${query}`, access);
  if (!response.ok) throw new BffError(failureOf(response.body));
  const page = listActivitiesResponseSchema.safeParse(response.body);
  if (!page.success) throw new BffError('unexpected');
  return { activities: page.data.activities.map(fromSummary), nextCursor: page.data.nextCursor };
}
