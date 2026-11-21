import { InvalidActivityError } from './errors';

function assertPositive(value: number, what: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new InvalidActivityError(`${what} must be a positive number, got ${value}`);
  }
}

export class Distance {
  private constructor(readonly meters: number) {}

  static ofMeters(meters: number): Distance {
    assertPositive(meters, 'Distance');
    return new Distance(meters);
  }
}

export class Duration {
  private constructor(readonly seconds: number) {}

  static ofSeconds(seconds: number): Duration {
    assertPositive(seconds, 'Duration');
    return new Duration(seconds);
  }
}

/** Time taken per kilometre. */
export class Pace {
  private constructor(readonly secondsPerKm: number) {}

  static from(distance: Distance, duration: Duration): Pace {
    return new Pace(duration.seconds / (distance.meters / 1000));
  }
}
