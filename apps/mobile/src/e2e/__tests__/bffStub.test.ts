import { fetchActivitiesSince } from '@/features/garmin';
import { installBffStub } from '../bffStub';

// The garmin entry point also exports its repository and screens: their storage is not used here.
jest.mock('@/db/client', () => ({ databaseReady: Promise.resolve() }));
jest.mock('expo-secure-store', () => jest.requireActual('@/test/memorySecureStore'));

const bffUrl = 'https://bff.example';
const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

describe('the in-app BFF stub of e2e builds', () => {
  it('serves a run this morning where the phone is, then nothing new from its cursor', async () => {
    // Tuesday 17 November 2026, 15:00 on the phone's clock.
    installBffStub(bffUrl, new Date(2026, 10, 17, 15, 0));

    const first = await fetchActivitiesSince({ bffUrl, token: 'e2e' }, null);
    const thisMorning = first.activities.find((a) => a.garminActivityId === 'e2e-1');
    expect(thisMorning).toMatchObject({ distanceMeters: 6000, durationSeconds: 1980, sessionId: null });
    // The local day, whatever the phone's timezone: 07:00 on the 17th with the phone's offset.
    expect(thisMorning?.startTime).toMatch(/^2026-11-17T07:00:00[+-]\d{2}:\d{2}$/);
    expect(Date.parse(thisMorning!.startTime)).toBe(new Date(2026, 10, 17, 7, 0).getTime());

    const next = await fetchActivitiesSince({ bffUrl, token: 'e2e' }, first.nextCursor);
    expect(next).toEqual({ activities: [], nextCursor: first.nextCursor });
  });

  it.each([
    ['a Tuesday', new Date(2026, 10, 17, 15, 0), '2026-11-12'],
    ['a Thursday, a week back', new Date(2026, 10, 19, 15, 0), '2026-11-12'],
    ['a Friday', new Date(2026, 10, 20, 15, 0), '2026-11-19'],
  ])('also serves, first, a run on the last Thursday before today, when the demo seed plans a Session: on %s', async (_, now, thursday) => {
    installBffStub(bffUrl, now);

    const { activities } = await fetchActivitiesSince({ bffUrl, token: 'e2e' }, null);

    expect(activities.map((a) => a.garminActivityId)).toEqual(['e2e-thursday', 'e2e-1']);
    expect(activities[0].startTime.slice(0, 10)).toBe(thursday);
  });

  it('leaves every other request to the network', async () => {
    const network = jest.fn(async () => new Response('{}'));
    globalThis.fetch = network;
    installBffStub(bffUrl, new Date(2026, 10, 17, 15, 0));

    await globalThis.fetch('https://elsewhere.example/v1/activities');

    expect(network).toHaveBeenCalledWith('https://elsewhere.example/v1/activities', undefined);
  });
});
