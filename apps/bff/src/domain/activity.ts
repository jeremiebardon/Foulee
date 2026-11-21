import { isRunning, type ActivityKind } from './activity-kind';
import { InvalidActivityError } from './errors';
import { Pace, type Distance, type Duration } from './measures';
import type { StartTime } from './start-time';

export interface ActivityProps {
  /** Garmin's activity id. */
  id: string;
  kind: ActivityKind;
  startTime: StartTime;
  distance: Distance;
  duration: Duration;
  averageHeartRateBpm?: number;
}

/** A recorded fact: something the runner did, as Garmin saw it. */
export class Activity {
  readonly averagePace: Pace;

  private constructor(private readonly props: ActivityProps) {
    this.averagePace = Pace.from(props.distance, props.duration);
  }

  static create(props: ActivityProps): Activity {
    if (props.id === '') {
      throw new InvalidActivityError('Activity id must not be empty');
    }
    const { averageHeartRateBpm } = props;
    if (averageHeartRateBpm !== undefined && !(Number.isInteger(averageHeartRateBpm) && averageHeartRateBpm > 0)) {
      throw new InvalidActivityError(`Average heart rate must be a positive whole number, got ${averageHeartRateBpm}`);
    }
    return new Activity(props);
  }

  get id(): string {
    return this.props.id;
  }
  get kind(): ActivityKind {
    return this.props.kind;
  }
  get startTime(): StartTime {
    return this.props.startTime;
  }
  get distance(): Distance {
    return this.props.distance;
  }
  get duration(): Duration {
    return this.props.duration;
  }
  get averageHeartRateBpm(): number | undefined {
    return this.props.averageHeartRateBpm;
  }

  /** Only running Activities are imported. */
  isRun(): boolean {
    return isRunning(this.props.kind);
  }
}
