import { InvalidActivityError } from './errors';

/** Real-world UTC offsets run from UTC-12:00 to UTC+14:00. */
const MIN_OFFSET_MINUTES = -12 * 60;
const MAX_OFFSET_MINUTES = 14 * 60;

/**
 * When an Activity started: the instant, plus the UTC offset of the place it
 * happened in, so the app can tell which local day the run belongs to.
 */
export class StartTime {
  private constructor(
    readonly instant: Date,
    readonly utcOffsetMinutes: number,
  ) {}

  static of(instant: Date, utcOffsetMinutes: number): StartTime {
    if (Number.isNaN(instant.getTime())) {
      throw new InvalidActivityError('Start time is not a valid date');
    }
    if (
      !Number.isInteger(utcOffsetMinutes) ||
      utcOffsetMinutes < MIN_OFFSET_MINUTES ||
      utcOffsetMinutes > MAX_OFFSET_MINUTES
    ) {
      throw new InvalidActivityError(`UTC offset of ${utcOffsetMinutes} minutes is not valid`);
    }
    return new StartTime(new Date(instant.getTime()), utcOffsetMinutes);
  }

  isAfter(instant: Date): boolean {
    return this.instant.getTime() > instant.getTime();
  }
}
