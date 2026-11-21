import { InvalidActivityError } from './errors';
import { Distance, Duration, Pace } from './measures';

describe('Distance', () => {
  it('holds a positive number of meters', () => {
    expect(Distance.ofMeters(10250.4).meters).toBe(10250.4);
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])('rejects %s meters', (meters) => {
    expect(() => Distance.ofMeters(meters)).toThrow(InvalidActivityError);
  });
});

describe('Duration', () => {
  it('holds a positive number of seconds', () => {
    expect(Duration.ofSeconds(3120).seconds).toBe(3120);
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])('rejects %s seconds', (seconds) => {
    expect(() => Duration.ofSeconds(seconds)).toThrow(InvalidActivityError);
  });
});

describe('Pace', () => {
  it('is the time taken per kilometre', () => {
    // 10 km in 50 minutes is 5:00 per km
    const pace = Pace.from(Distance.ofMeters(10_000), Duration.ofSeconds(3000));
    expect(pace.secondsPerKm).toBe(300);
  });

  it('is not rounded and works for distances under a kilometre', () => {
    // 500 m in 150.5 s is 301 s per km
    expect(Pace.from(Distance.ofMeters(500), Duration.ofSeconds(150.5)).secondsPerKm).toBe(301);
    // 1 km in 301.5 s keeps its half second
    expect(Pace.from(Distance.ofMeters(1000), Duration.ofSeconds(301.5)).secondsPerKm).toBe(301.5);
  });
});
