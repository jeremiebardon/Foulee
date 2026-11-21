import { InMemoryActivitySource, sampleActivities } from './in-memory-activity-source';

describe('InMemoryActivitySource', () => {
  it('holds sample Activities of several kinds, so the running filter has something to filter', async () => {
    const kinds = new Set((await new InMemoryActivitySource(sampleActivities()).listActivitiesSince(undefined)).map((a) => a.kind));
    expect(kinds.has('running')).toBe(true);
    expect(kinds.size).toBeGreaterThan(1);
  });

  it('returns everything when no cursor is given', async () => {
    const all = sampleActivities();
    expect(await new InMemoryActivitySource(all).listActivitiesSince(undefined)).toHaveLength(all.length);
  });

  it('returns only Activities that started after the cursor', async () => {
    const all = sampleActivities();
    const cutoff = all[1].startTime.instant;
    const result = await new InMemoryActivitySource(all).listActivitiesSince(cutoff);
    expect(result.every((a) => a.startTime.isAfter(cutoff))).toBe(true);
    expect(result.length).toBeLessThan(all.length);
  });
});
