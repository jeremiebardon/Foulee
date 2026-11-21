import {
  activitySummarySchema,
  listActivitiesQuerySchema,
  listActivitiesResponseSchema,
} from '../index';

const summary = {
  garminActivityId: '19876543210',
  startTime: '2026-11-18T07:30:00+01:00',
  distanceMeters: 10250.4,
  durationSeconds: 3120,
  averagePaceSecondsPerKm: 304.4,
};

describe('activitySummarySchema', () => {
  it('accepts a summary without heart rate', () => {
    expect(activitySummarySchema.parse(summary)).toEqual(summary);
  });

  it('accepts a summary with an average heart rate', () => {
    const withHr = { ...summary, averageHeartRateBpm: 152 };
    expect(activitySummarySchema.parse(withHr)).toEqual(withHr);
  });

  it('rejects a non-integer or non-positive heart rate', () => {
    expect(activitySummarySchema.safeParse({ ...summary, averageHeartRateBpm: 152.5 }).success).toBe(false);
    expect(activitySummarySchema.safeParse({ ...summary, averageHeartRateBpm: 0 }).success).toBe(false);
  });

  it.each(['2026-11-18T07:30:00+01:00', '2026-11-18T06:30:00Z', '2026-11-18T07:30:00-05:00'])(
    'keeps the timezone offset of start time %s',
    (startTime) => {
      expect(activitySummarySchema.parse({ ...summary, startTime }).startTime).toBe(startTime);
    },
  );

  it.each(['2026-11-18T07:30:00', '2026-11-18', 'yesterday'])(
    'rejects a start time without a timezone: %s',
    (startTime) => {
      expect(activitySummarySchema.safeParse({ ...summary, startTime }).success).toBe(false);
    },
  );

  it('rejects zero or negative distance, duration and pace', () => {
    for (const key of ['distanceMeters', 'durationSeconds', 'averagePaceSecondsPerKm'] as const) {
      expect(activitySummarySchema.safeParse({ ...summary, [key]: 0 }).success).toBe(false);
      expect(activitySummarySchema.safeParse({ ...summary, [key]: -1 }).success).toBe(false);
    }
  });

  it('ignores fields it does not know, so additive changes keep old clients working', () => {
    expect(activitySummarySchema.parse({ ...summary, somethingNew: true })).toEqual(summary);
  });
});

describe('listActivitiesResponseSchema', () => {
  it('accepts a page with a cursor', () => {
    const page = { activities: [summary], nextCursor: '2026-11-18T06:30:00.000Z' };
    expect(listActivitiesResponseSchema.parse(page)).toEqual(page);
  });

  it('accepts an empty page with no cursor', () => {
    const page = { activities: [], nextCursor: null };
    expect(listActivitiesResponseSchema.parse(page)).toEqual(page);
  });
});

describe('listActivitiesQuerySchema', () => {
  it('treats since as optional', () => {
    expect(listActivitiesQuerySchema.parse({})).toEqual({});
  });

  it('accepts a cursor returned by the API', () => {
    expect(listActivitiesQuerySchema.parse({ since: '2026-11-18T06:30:00.000Z' })).toEqual({
      since: '2026-11-18T06:30:00.000Z',
    });
  });

  it('rejects a cursor that is not an ISO instant', () => {
    expect(listActivitiesQuerySchema.safeParse({ since: 'abc' }).success).toBe(false);
  });
});
