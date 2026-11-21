import { addDays, diffDays, mondayOf, monthGrid } from './dates';
import { formatClock, formatDistance, formatDuration, parseClock, parseDistance, parsePace } from './format';

describe('dates', () => {
  it('handles Monday-based weeks and DST', () => {
    expect(mondayOf('2026-11-15')).toBe('2026-11-09');
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(diffDays('2026-11-02', '2026-10-26')).toBe(7);
  });

  it('builds full weeks around a month', () => {
    const grid = monthGrid(2026, 10);
    expect([grid[0], grid.at(-1), grid.length % 7]).toEqual(['2026-10-26', '2026-12-06', 0]);
  });
});

describe('format and parse', () => {
  it('formats', () => {
    expect([formatDistance(400), formatDistance(10500), formatDuration(3120), formatDuration(3900), formatClock(3150), formatClock(3900)])
      .toEqual(['400 m', '10,5 km', '52 min', '1 h 05', '52:30', '1:05:00']);
  });

  it('rounds a duration just under the hour up to the next one', () => {
    // 1 h 59 min 40 s is closer to 2 h than to 1 h 59.
    expect(formatDuration(7180)).toBe('2 h 00');
  });

  it('refuses clock minutes or seconds of 60 and more', () => {
    expect(['52:60', '1:75:00'].map(parseClock)).toEqual([null, null]);
  });

  it('parses distances, paces and clocks', () => {
    expect(['400 m', '400', '2 km', '2,5', '10k', 'x'].map(parseDistance)).toEqual([400, 400, 2000, 2500, 10000, null]);
    expect(['4:30', "4'30", '5', '4:75', '1:00'].map(parsePace)).toEqual([270, 270, 300, null, null]);
    expect(['52:30', '1:05:00', '45', '1:00', 'x'].map(parseClock)).toEqual([3150, 3900, 2700, 60, null]);
  });

  it('round-trips the editor formats', () => {
    for (const m of [400, 1000, 2500, 21100]) expect(parseDistance(formatDistance(m))).toBe(m);
    for (const s of [60, 90, 600, 3900]) expect(parseClock(formatClock(s))).toBe(s);
  });
});
