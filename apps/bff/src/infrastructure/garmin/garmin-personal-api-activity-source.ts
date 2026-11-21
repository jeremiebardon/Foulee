import { Logger } from '@nestjs/common';
import type { ActivitySource } from '../../application/activity-source';
import { Activity, Distance, Duration, GarminAccessExpiredError, InvalidActivityError, StartTime } from '../../domain';
import { garminActivityListSchema, toRunningKind, type GarminActivitySummary } from './garmin-activity-summary';

/*
 * Garmin Connect Personal API (ADR 0007). Confirmed against:
 * - the OpenAPI spec embedded in https://developer.garmin.com/gc-developer-program/personal/swagger-docs/
 *   ("Garmin Connect Personal API" 1.0.0, read 2026-11-21): the server, `GET
 *   /activitylist-service/activities/search/activities` (start, limit and an inclusive local
 *   startDate; a bare array of SummarizedActivityDTO; 401 when authentication is invalid), and
 *   the summary fields read in garmin-activity-summary.ts;
 * - Garmin's reference client, github.com/garmin/connect-personal-api-python at 958ef58: the
 *   token endpoint, `Authorization: ApiKey <key>`, the plain-text JWT it returns, and reusing
 *   that token while more than an hour remains before its `exp`.
 */
const GARMIN_PERSONAL_API_BASE_URL = 'https://personal.connectapi.garmin.com';
const TOKEN_PATH = '/personalapitoken-service/personal-api/personal-api-key/token';
const ACTIVITY_LIST_PATH = '/activitylist-service/activities/search/activities';
const DAY_MS = 24 * 60 * 60 * 1000;
/** Same window as Garmin's reference client. */
const TOKEN_REFRESH_WINDOW_MS = 60 * 60 * 1000;

/** Garmin refuses the key or the token it was exchanged for. */
const isRefusal = (status: number): boolean => status === 401 || status === 403;

interface BearerToken {
  accessToken: string;
  /** Milliseconds since the epoch, from the JWT's `exp`. */
  expiresAt: number;
}

export interface GarminPersonalApiOptions {
  apiKey: string;
  fetch: typeof fetch;
  /** Milliseconds since the epoch. */
  now?: () => number;
  /** Activities requested per page. */
  pageSize?: number;
  logger?: Pick<Logger, 'warn'>;
}

/**
 * Reads the owner's running Activities from the Garmin Connect Personal API. Error messages
 * never carry the key, the token or Garmin's response bodies (which could echo either).
 */
export class GarminPersonalApiActivitySource implements ActivitySource {
  private readonly apiKey: string;
  private readonly fetch: typeof fetch;
  private readonly now: () => number;
  private readonly pageSize: number;
  private readonly logger: Pick<Logger, 'warn'>;
  /** In memory only: a restart exchanges the key again. */
  private token: Promise<BearerToken | undefined> = Promise.resolve(undefined);

  constructor(options: GarminPersonalApiOptions) {
    this.apiKey = options.apiKey;
    this.fetch = options.fetch;
    this.now = options.now ?? Date.now;
    this.pageSize = options.pageSize ?? 100;
    this.logger = options.logger ?? new Logger(GarminPersonalApiActivitySource.name);
  }

  /** Running Activities only, whatever else Garmin holds. */
  async listActivitiesSince(since: Date | undefined): Promise<Activity[]> {
    // Keyed by id: offsets count from the newest activity, so one uploaded mid-import repeats a run.
    const activities = new Map<string, Activity>();
    let token = await this.bearerToken();
    // Stop on an empty page rather than a short one: Garmin does not document a maximum limit.
    for (let start = 0; ; start += this.pageSize) {
      const page = await this.fetchPage(start, since, token);
      if (page.summaries.length === 0) return [...activities.values()];
      token = page.token;
      for (const summary of page.summaries) {
        const activity = this.toActivity(summary);
        if (activity && (since === undefined || activity.startTime.isAfter(since))) activities.set(activity.id, activity);
      }
    }
  }

  /** One page of the list, and the token that read it: a new one when Garmin refused `token`. */
  private async fetchPage(
    start: number,
    since: Date | undefined,
    token: string,
  ): Promise<{ summaries: GarminActivitySummary[]; token: string }> {
    const url = new URL(ACTIVITY_LIST_PATH, GARMIN_PERSONAL_API_BASE_URL);
    url.searchParams.set('start', String(start));
    url.searchParams.set('limit', String(this.pageSize));
    // startDate is an inclusive local date: a day earlier covers every UTC offset, then we filter exactly.
    if (since) url.searchParams.set('startDate', new Date(since.getTime() - DAY_MS).toISOString().slice(0, 10));

    let response = await this.getWithToken(url, token);
    if (isRefusal(response.status)) {
      // A token can be revoked before its `exp`: exchange the key once more before giving up.
      this.token = Promise.resolve(undefined);
      token = await this.bearerToken();
      response = await this.getWithToken(url, token);
      if (isRefusal(response.status)) throw new GarminAccessExpiredError();
    }
    if (!response.ok) throw new Error(`Garmin activity list request failed with HTTP ${response.status}`);

    const parsed = garminActivityListSchema.safeParse(await response.json());
    if (!parsed.success) {
      const problems = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
      throw new Error(`Garmin activity list response did not match the Personal API spec. ${problems.join('; ')}`);
    }
    return { summaries: parsed.data, token };
  }

  private getWithToken(url: URL, token: string): Promise<Response> {
    return this.fetch(url, { headers: { Accept: 'application/json', Authorization: `Bearer ${token}` } });
  }

  /** The cached token while more than an hour remains before it expires; a fresh one otherwise. */
  private async bearerToken(): Promise<string> {
    // Each lookup chains onto the previous one, so concurrent callers share one exchange.
    // A failed exchange leaves no token behind: the next lookup tries again.
    const next = this.token
      .catch(() => undefined)
      .then((cached) =>
        cached && cached.expiresAt - this.now() > TOKEN_REFRESH_WINDOW_MS ? cached : this.exchangeKey(),
      );
    this.token = next;
    return (await next).accessToken;
  }

  private async exchangeKey(): Promise<BearerToken> {
    const response = await this.fetch(new URL(TOKEN_PATH, GARMIN_PERSONAL_API_BASE_URL), {
      method: 'POST',
      headers: { Accept: '*/*', Authorization: `ApiKey ${this.apiKey}` },
    });
    if (isRefusal(response.status)) throw new GarminAccessExpiredError();
    if (!response.ok) throw new Error(`Garmin token exchange failed with HTTP ${response.status}`);
    const accessToken = (await response.text()).trim();
    return { accessToken, expiresAt: jwtExpiry(accessToken) };
  }

  /** The domain Activity for a running summary; undefined for anything else, or a run the domain rejects. */
  private toActivity(summary: GarminActivitySummary): Activity | undefined {
    const kind = toRunningKind(summary.activityType);
    if (!kind) return undefined;
    const instant = parseGarminTime(summary.startTimeGMT);
    try {
      return Activity.create({
        id: String(summary.activityId),
        kind,
        startTime: StartTime.of(
          new Date(instant),
          Math.round((parseGarminTime(summary.startTimeLocal) - instant) / 60_000),
        ),
        distance: Distance.ofMeters(summary.distance ?? 0),
        duration: Duration.ofSeconds(summary.duration ?? 0),
        averageHeartRateBpm: summary.averageHR === undefined ? undefined : Math.round(summary.averageHR),
      });
    } catch (error) {
      // Activity.create and its value objects throw only InvalidActivityError. One odd recording
      // (a treadmill run with no distance, say) must not block the whole import.
      this.logger.warn(`Skipped Garmin activity ${summary.activityId}: ${(error as InvalidActivityError).message}`);
      return undefined;
    }
  }
}

/** Garmin writes times as `yyyy-MM-dd HH:mm:ss`, without an offset. */
const parseGarminTime = (value: string): number => Date.parse(`${value.replace(' ', 'T')}Z`);

/** The `exp` claim of a JWT, unverified: we only need to know when to exchange the key again. */
function jwtExpiry(accessToken: string): number {
  let exp: unknown;
  try {
    exp = JSON.parse(Buffer.from(accessToken.split('.')[1] ?? '', 'base64url').toString('utf8')).exp;
  } catch {
    exp = undefined;
  }
  if (typeof exp !== 'number') throw new Error('Garmin token endpoint did not return a JWT with an exp claim');
  return exp * 1000;
}
