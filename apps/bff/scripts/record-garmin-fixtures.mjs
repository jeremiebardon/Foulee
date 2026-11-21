// Records the Garmin Personal API responses the adapter tests replay, anonymised.
//
// Run by the owner, with their own key, from apps/bff:
//   pnpm record:garmin-fixtures
// The key comes from GARMIN_PERSONAL_API_KEY in the environment or .env.local. It is sent
// only to Garmin, never written or printed. Review the diff before committing the fixtures.
//
// Anonymisation: the token becomes an unsigned JWT that keeps only its lifetime; each activity
// keeps only the fields the adapter reads, gets a made-up id, and is moved by whole days so the
// newest one starts the day before the token is issued (times of day and UTC offsets are kept).
// The adapter tests assert values from these fixtures: after re-recording, update them.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseEnv } from 'node:util';

const BASE_URL = 'https://personal.connectapi.garmin.com';
const TOKEN_PATH = '/personalapitoken-service/personal-api/personal-api-key/token';
const ACTIVITY_LIST_PATH = '/activitylist-service/activities/search/activities';
// Must match RECORDED_PAGE_SIZE in fake-garmin.ts.
const PAGE_SIZE = 5;
const PAGES = [0, 5, 10];
/** Must match the issued-at the fake reads from the token fixture: 2026-11-20T12:00:00Z. */
const ANONYMISED_ISSUED_AT_SECONDS = 1_795_176_000;
const DAY_MS = 24 * 60 * 60 * 1000;
const FIXTURES = join(import.meta.dirname, '..', 'src', 'infrastructure', 'garmin', '__tests__', 'fixtures');

function apiKey() {
  const fromFile = existsSync('.env.local') ? parseEnv(readFileSync('.env.local', 'utf8')) : {};
  const key = process.env.GARMIN_PERSONAL_API_KEY ?? fromFile.GARMIN_PERSONAL_API_KEY;
  if (!key || key.startsWith('replace-with')) {
    throw new Error('Set GARMIN_PERSONAL_API_KEY (environment or .env.local) to your Personal API Key.');
  }
  return key;
}

const base64url = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');

/** Status only: Garmin's response bodies could echo the key or the token. */
async function ensureOk(response, what) {
  if (!response.ok) throw new Error(`${what} failed with HTTP ${response.status}`);
  return response;
}

async function recordToken(key) {
  const response = await ensureOk(
    await fetch(`${BASE_URL}${TOKEN_PATH}`, { method: 'POST', headers: { Accept: '*/*', Authorization: `ApiKey ${key}` } }),
    'Token exchange',
  );
  const accessToken = (await response.text()).trim();
  const claims = JSON.parse(Buffer.from(accessToken.split('.')[1], 'base64url').toString('utf8'));
  const lifetimeSeconds = claims.exp - (claims.iat ?? Math.floor(Date.now() / 1000));
  const anonymised = `${base64url({ alg: 'none', typ: 'JWT' })}.${base64url({
    iat: ANONYMISED_ISSUED_AT_SECONDS,
    exp: ANONYMISED_ISSUED_AT_SECONDS + lifetimeSeconds,
  })}.anonymised`;
  writeFileSync(join(FIXTURES, 'token-response.txt'), `${anonymised}\n`);
  console.log(`token-response.txt: token lifetime ${lifetimeSeconds / 3600} h`);
  return accessToken;
}

async function recordPages(token) {
  const pages = [];
  for (const start of PAGES) {
    const url = new URL(ACTIVITY_LIST_PATH, BASE_URL);
    url.searchParams.set('start', String(start));
    url.searchParams.set('limit', String(PAGE_SIZE));
    const response = await ensureOk(
      await fetch(url, { headers: { Accept: 'application/json', Authorization: `Bearer ${token}` } }),
      `Activity list (start ${start})`,
    );
    pages.push(await response.json());
  }
  return pages;
}

const garminTime = (ms) => new Date(ms).toISOString().slice(0, 19).replace('T', ' ');
const parseGarminTime = (value) => Date.parse(`${value.replace(' ', 'T')}Z`);

function anonymise(pages) {
  const all = pages.flat();
  if (all.length === 0) throw new Error('Garmin returned no activities: record once you have some.');
  const newest = Math.max(...all.map((a) => parseGarminTime(a.startTimeGMT)));
  const target = ANONYMISED_ISSUED_AT_SECONDS * 1000 - DAY_MS;
  const shift = Math.round((target - newest) / DAY_MS) * DAY_MS;
  let nextId = 9_000_000_000 + all.length;

  return pages.map((page) =>
    page.map((activity) => {
      const startGmt = parseGarminTime(activity.startTimeGMT) + shift;
      const kept = {
        activityId: nextId--,
        activityType: {
          typeId: activity.activityType?.typeId,
          typeKey: activity.activityType?.typeKey,
          parentTypeId: activity.activityType?.parentTypeId,
        },
        startTimeGMT: garminTime(startGmt),
        startTimeLocal: garminTime(parseGarminTime(activity.startTimeLocal) + shift),
        distance: activity.distance,
        duration: activity.duration,
        averageHR: activity.averageHR,
      };
      return Object.fromEntries(Object.entries(kept).filter(([, value]) => value !== undefined && value !== null));
    }),
  );
}

const key = apiKey();
const pages = anonymise(await recordPages(await recordToken(key)));
pages.forEach((page, index) => {
  const name = `activities-start-${PAGES[index]}.json`;
  writeFileSync(join(FIXTURES, name), `${JSON.stringify(page, null, 2)}\n`);
  console.log(`${name}: ${page.length} activities`);
});
console.log('Done. Review the fixtures, then update the values the adapter tests assert.');
