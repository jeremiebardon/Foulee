import { activityDate, fromSummary, garminImportAvailable, newestFirst, type Activity } from '../activity';

const morningRun: Activity = {
  garminActivityId: '1001',
  startTime: '2026-11-17T07:30:00+01:00',
  distanceMeters: 8012.5,
  durationSeconds: 2640,
  averagePaceSecondsPerKm: 329.5,
  averageHeartRateBpm: 148,
  sessionId: null,
};

describe('an imported Activity', () => {
  it('keeps what the BFF sent, unlinked: a new Activity is an Unplanned Activity', () => {
    expect(
      fromSummary({
        garminActivityId: '1001',
        startTime: '2026-11-17T07:30:00+01:00',
        distanceMeters: 8012.5,
        durationSeconds: 2640,
        averagePaceSecondsPerKm: 329.5,
        averageHeartRateBpm: 148,
      }),
    ).toEqual(morningRun);
  });

  it('has no heart rate when the watch recorded none', () => {
    const { averageHeartRateBpm, ...withoutHeartRate } = morningRun;
    expect(averageHeartRateBpm).toBe(148);
    expect(fromSummary(withoutHeartRate).averageHeartRateBpm).toBeNull();
  });

  it('happened on the local day of the place it was run, whatever the phone’s timezone', () => {
    expect(activityDate(morningRun)).toBe('2026-11-17');
    // 23:30 in New York is already the next day in UTC: the run still belongs to the 17th.
    expect(activityDate({ ...morningRun, startTime: '2026-11-17T23:30:00-05:00' })).toBe('2026-11-17');
    expect(activityDate({ ...morningRun, startTime: '2026-11-18T00:15:00Z' })).toBe('2026-11-18');
  });
});

describe('the list of Activities', () => {
  it('shows the most recent run first, by the instant it started', () => {
    const tokyoMorning = { ...morningRun, garminActivityId: '1002', startTime: '2026-11-18T08:00:00+09:00' };
    const parisEvening = { ...morningRun, garminActivityId: '1003', startTime: '2026-11-17T19:00:00+01:00' };
    // 08:00 in Tokyo on the 18th is 23:00 UTC on the 17th, after the Paris evening run (18:00 UTC).
    expect(newestFirst([morningRun, parisEvening, tokyoMorning]).map((a) => a.garminActivityId)).toEqual(['1002', '1003', '1001']);
  });
});

describe('the Garmin import', () => {
  it('is available only once the build has a BFF URL and the runner has saved an access token', () => {
    expect(garminImportAvailable({ bffUrl: 'http://localhost:3000', token: 'secret' })).toBe(true);
    expect(garminImportAvailable({ bffUrl: null, token: 'secret' })).toBe(false);
    expect(garminImportAvailable({ bffUrl: 'http://localhost:3000', token: null })).toBe(false);
    expect(garminImportAvailable({ bffUrl: null, token: null })).toBe(false);
  });
});
