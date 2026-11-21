import {
  Activity,
  Distance,
  Duration,
  GarminAccessExpiredError,
  StartTime,
  type ActivityKind,
} from '../../domain';
import { ListActivitiesSince } from '../list-activities-since';
import type { ActivitySource } from '../activity-source';

function activity(id: string, startedAt: string, kind: ActivityKind = 'running'): Activity {
  return Activity.create({
    id,
    kind,
    startTime: StartTime.of(new Date(startedAt), 60),
    distance: Distance.ofMeters(10_000),
    duration: Duration.ofSeconds(3000),
  });
}

/** A fake Garmin: it hands back everything it holds, whatever was asked, like a sloppy source. */
class FakeActivitySource implements ActivitySource {
  constructor(private readonly held: Activity[] | Error) {}

  async listActivitiesSince(): Promise<Activity[]> {
    if (this.held instanceof Error) throw this.held;
    return this.held;
  }
}

function useCase(held: Activity[] | Error): ListActivitiesSince {
  return new ListActivitiesSince(new FakeActivitySource(held));
}

const ids = (activities: Activity[]): string[] => activities.map((a) => a.id);

describe('ListActivitiesSince', () => {
  it('returns running Activities oldest first, even when the source returns them in another order', async () => {
    const result = await useCase([
      activity('b', '2026-11-18T06:30:00Z'),
      activity('c', '2026-11-19T06:30:00Z'),
      activity('a', '2026-11-17T06:30:00Z'),
    ]).execute({});

    expect(ids(result.activities)).toEqual(['a', 'b', 'c']);
  });

  it('orders Activities that started at the same instant by id, so the result is stable', async () => {
    const result = await useCase([
      activity('z', '2026-11-18T06:30:00Z'),
      activity('m', '2026-11-18T06:30:00Z'),
    ]).execute({});

    expect(ids(result.activities)).toEqual(['m', 'z']);
  });

  it('only imports running: a ride or a swim is left out', async () => {
    const result = await useCase([
      activity('run', '2026-11-17T06:30:00Z'),
      activity('ride', '2026-11-18T06:30:00Z', 'cycling'),
      activity('swim', '2026-11-19T06:30:00Z', 'swimming'),
      activity('trail', '2026-11-20T06:30:00Z', 'trail_running'),
    ]).execute({});

    expect(ids(result.activities)).toEqual(['run', 'trail']);
  });

  it('returns only Activities that started strictly after the cursor', async () => {
    const result = await useCase([
      activity('before', '2026-11-17T06:30:00Z'),
      activity('at', '2026-11-18T06:30:00Z'),
      activity('after', '2026-11-19T06:30:00Z'),
    ]).execute({ since: new Date('2026-11-18T06:30:00Z') });

    expect(ids(result.activities)).toEqual(['after']);
  });

  it('points the next cursor at the start of the latest Activity returned', async () => {
    const result = await useCase([
      activity('a', '2026-11-17T06:30:00Z'),
      activity('b', '2026-11-19T06:30:00Z'),
    ]).execute({});

    expect(result.nextCursor).toEqual(new Date('2026-11-19T06:30:00Z'));
  });

  it('keeps the same cursor when there is nothing new, so the client does not move backwards', async () => {
    const since = new Date('2026-11-19T06:30:00Z');
    const result = await useCase([activity('old', '2026-11-17T06:30:00Z')]).execute({ since });

    expect(result.activities).toEqual([]);
    expect(result.nextCursor).toEqual(since);
  });

  it('has no cursor yet when there is nothing and none was given', async () => {
    const result = await useCase([activity('ride', '2026-11-17T06:30:00Z', 'cycling')]).execute({});

    expect(result.activities).toEqual([]);
    expect(result.nextCursor).toBeUndefined();
  });

  it('lets a Garmin access error through, so the HTTP layer can report it', async () => {
    await expect(useCase(new GarminAccessExpiredError()).execute({})).rejects.toBeInstanceOf(
      GarminAccessExpiredError,
    );
  });
});
