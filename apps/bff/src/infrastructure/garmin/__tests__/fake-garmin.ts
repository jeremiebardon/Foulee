import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** Fixtures are written by `scripts/record-garmin-fixtures.mjs`; this is the page size it records with. */
export const RECORDED_PAGE_SIZE = 5;

const fixture = (name: string): string => readFileSync(join(__dirname, 'fixtures', name), 'utf8');

/** The recorded token response: an anonymised JWT that keeps only its issue and expiry instants. */
export const RECORDED_TOKEN = fixture('token-response.txt').trim();
const claims = JSON.parse(Buffer.from(RECORDED_TOKEN.split('.')[1], 'base64url').toString('utf8')) as {
  iat: number;
  exp: number;
};
export const RECORDED_TOKEN_ISSUED_AT = claims.iat * 1000;
export const RECORDED_TOKEN_EXPIRES_AT = claims.exp * 1000;

/** Every recorded activity, newest first as Garmin lists them: the recorded pages end to end. */
export function recordedActivities(): Record<string, unknown>[] {
  return [0, 5, 10].flatMap((start) => JSON.parse(fixture(`activities-start-${start}.json`)) as Record<string, unknown>[]);
}

export interface RecordedRequest {
  method: string;
  url: URL;
  headers: Headers;
}

type Reply = { status: number; body: string };

/**
 * Stands in for Garmin's HTTP API behind `fetch`. It hands out the recorded token, pages through
 * the recorded activities for that token only, and can be told to answer differently.
 */
export class FakeGarmin {
  readonly requests: RecordedRequest[] = [];
  /** What the token endpoint answers next; the recorded token once the queue is empty. */
  readonly tokenReplies: Reply[] = [];
  /** What the activity list answers next, before serving pages; empty means serve pages. */
  readonly activityReplies: Reply[] = [];
  /** What the activity list pages through. */
  activities = recordedActivities();

  readonly fetch: typeof fetch = async (input, init) => {
    const url = new URL(String(input));
    const headers = new Headers(init?.headers);
    const method = init?.method ?? 'GET';
    this.requests.push({ method, url, headers });

    if (url.pathname === '/personalapitoken-service/personal-api/personal-api-key/token') {
      const reply = this.tokenReplies.shift() ?? { status: 200, body: `${RECORDED_TOKEN}\n` };
      return new Response(reply.body, { status: reply.status });
    }
    if (url.pathname === '/activitylist-service/activities/search/activities') {
      const reply = this.activityReplies.shift();
      if (reply) return new Response(reply.body, { status: reply.status });
      if (headers.get('authorization') !== `Bearer ${RECORDED_TOKEN}`) return new Response('', { status: 401 });
      const start = Number(url.searchParams.get('start'));
      return Response.json(this.activities.slice(start, start + Number(url.searchParams.get('limit'))));
    }
    return new Response('not found', { status: 404 });
  };

  tokenExchanges(): RecordedRequest[] {
    return this.requests.filter((r) => r.url.pathname.endsWith('/token'));
  }

  activityListCalls(): RecordedRequest[] {
    return this.requests.filter((r) => r.url.pathname.endsWith('/search/activities'));
  }
}
