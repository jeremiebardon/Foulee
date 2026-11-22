import { toSessionViews } from '@/features/plans/domain';
import { session } from '@/test/fakeRepositories';
import { footing, marathon, tenK, vma } from '@/test/fixtures';
import type { Activity } from '../activity';
import { linkCandidates, linking, suggestions, unlinking } from '../link';

const run = (garminActivityId: string, startTime: string, distanceMeters = 8000, more: Partial<Activity> = {}): Activity => ({
  garminActivityId,
  startTime,
  distanceMeters,
  durationSeconds: 2640,
  averagePaceSecondsPerKm: 330,
  averageHeartRateBpm: null,
  sessionId: null,
  declinedSessionId: null,
  handLoggedMeters: null,
  handLoggedSeconds: null,
  ...more,
});

// « Objectif 10 km » (selected) runs Monday 9 to Sunday 29 November; « Marathon » starts in December.
const views = toSessionViews(
  [tenK, marathon],
  [
    session('tue10', 'p1', 'footing', 0, 1), // Tuesday 10 November
    session('thu19', 'p1', 'vma', 1, 3), // Thursday 19 November
    session('fri20', 'p1', 'footing', 1, 4), // Friday 20 November
    session('mon7', 'p2', 'footing', 0, 0), // Monday 7 December, in the other plan
  ],
  [footing, vma],
);

const suggested = (activities: Activity[], planId: string | null = 'p1') =>
  Object.fromEntries([...suggestions(activities, views, planId)].map(([id, view]) => [id, view.session.id]));

describe('the Session suggested for an Activity', () => {
  it('is the one planned on the local day the Activity was run, in the selected Plan', () => {
    expect(suggested([run('a', '2026-11-19T18:00:00+01:00')])).toEqual({ a: 'thu19' });
  });

  it('is none on a rest day, nor on a day planned only in another Plan', () => {
    expect(suggested([run('wed', '2026-11-18T07:00:00+01:00'), run('dec', '2026-12-07T07:00:00+01:00')])).toEqual({});
    expect(suggested([run('a', '2026-11-19T18:00:00+01:00')], null)).toEqual({});
  });

  it('follows the clock where the run happened, not UTC, around midnight', () => {
    // 23:50 in Montréal on Thursday the 19th is already Friday in UTC: still Thursday's Session.
    // 00:20 in Paris on Friday the 20th is still Thursday in UTC: Friday's Session.
    expect(suggested([run('late', '2026-11-19T23:50:00-05:00'), run('early', '2026-11-20T00:20:00+01:00')])).toEqual({ late: 'thu19', early: 'fri20' });
  });

  it('is none once the Session is completed by another Activity: a Session has at most one Activity', () => {
    expect(suggested([run('linked', '2026-11-19T07:00:00+01:00', 5000, { sessionId: 'thu19' }), run('b', '2026-11-19T18:00:00+01:00')])).toEqual({});
  });

  it('goes to one of two Activities run the same day: the longer, the planned run rather than a shake-out', () => {
    const shakeOut = run('shake-out', '2026-11-19T07:00:00+01:00', 3000);
    const intervals = run('intervals', '2026-11-19T18:00:00+01:00', 9000);
    expect(suggested([shakeOut, intervals])).toEqual({ intervals: 'thu19' });
    // Same distance: the first run of the day.
    expect(suggested([run('evening', '2026-11-19T18:00:00+01:00'), run('morning', '2026-11-19T07:00:00+01:00')])).toEqual({ morning: 'thu19' });
  });

  it('is not made again once declined; another Activity of that day may get it', () => {
    const declined = run('declined', '2026-11-19T18:00:00+01:00', 9000, { declinedSessionId: 'thu19' });
    expect(suggested([declined])).toEqual({});
    expect(suggested([declined, run('other', '2026-11-19T07:00:00+01:00', 3000)])).toEqual({ other: 'thu19' });
  });

  it('pairs two Sessions planned the same day with two Activities of that day, one each', () => {
    const doubleDay = toSessionViews([tenK], [session('am', 'p1', 'footing', 1, 3), session('pm', 'p1', 'vma', 1, 3)], [footing, vma]);
    const both = [run('long', '2026-11-19T07:00:00+01:00', 9000), run('short', '2026-11-19T18:00:00+01:00', 4000)];
    expect(Object.fromEntries([...suggestions(both, doubleDay, 'p1')].map(([id, view]) => [id, view.session.id]))).toEqual({ long: 'am', short: 'pm' });
  });
});

describe('the Sessions an Activity can be linked to by hand', () => {
  const candidates = (activity: Activity, activities: Activity[] = [activity], planId: string | null = 'p1') =>
    linkCandidates(activity, activities, views, planId).map((v) => v.session.id);

  it('are the selected Plan’s Sessions, nearest the day it was run first: a Session done a day late is at hand', () => {
    // Run on Saturday the 21st: Friday's Session is one day off, Thursday's two, the 10th's eleven.
    expect(candidates(run('sat', '2026-11-21T09:00:00+01:00'))).toEqual(['fri20', 'thu19', 'tue10']);
  });

  it('leave out Sessions another Activity completes, and the Activity’s own', () => {
    const linked = run('linked', '2026-11-19T07:00:00+01:00', 5000, { sessionId: 'thu19' });
    expect(candidates(run('sat', '2026-11-21T09:00:00+01:00'), [linked, run('sat', '2026-11-21T09:00:00+01:00')])).toEqual(['fri20', 'tue10']);
    expect(candidates(linked)).toEqual(['fri20', 'tue10']);
  });

  it('are none without a selected Plan', () => {
    expect(candidates(run('sat', '2026-11-21T09:00:00+01:00'), undefined, null)).toEqual([]);
  });

  it('come earlier day first when two are as near', () => {
    const around = toSessionViews([tenK], [session('after', 'p1', 'footing', 1, 5), session('before', 'p1', 'footing', 1, 3)], [footing]);
    expect(linkCandidates(run('fri', '2026-11-20T09:00:00+01:00'), [], around, 'p1').map((v) => v.session.id)).toEqual(['before', 'after']);
  });
});

describe('linking an Activity to a Session', () => {
  const thursday = run('a', '2026-11-19T18:00:00+01:00', 8012.6, { durationSeconds: 2640.4 });

  it('records the Activity’s distance and duration as what was run, the same as logging it by hand', () => {
    expect(linking(thursday, session('thu19', 'p1', 'vma', 1, 3)).session).toEqual({ doneMeters: 8013, doneSeconds: 2640 });
  });

  it('links the Activity to the Session, which is no longer a declined suggestion for it', () => {
    const declined = { ...thursday, declinedSessionId: 'thu19' };
    expect(linking(declined, session('thu19', 'p1', 'vma', 1, 3)).activity).toMatchObject({ sessionId: 'thu19', declinedSessionId: null });
  });

  it('keeps what had been logged by hand on the Session, to give it back on unlink', () => {
    const loggedByHand = session('thu19', 'p1', 'vma', 1, 3, { meters: 5000, seconds: 1500 });
    expect(linking(thursday, loggedByHand).activity).toMatchObject({ handLoggedMeters: 5000, handLoggedSeconds: 1500 });
  });
});

describe('unlinking an Activity from its Session', () => {
  const linked = run('a', '2026-11-19T18:00:00+01:00', 8000, { sessionId: 'thu19' });

  it('makes it an Unplanned Activity again, the Session no longer suggested for it', () => {
    expect(unlinking(linked).activity).toEqual({ sessionId: null, declinedSessionId: 'thu19', handLoggedMeters: null, handLoggedSeconds: null });
  });

  it('leaves the Session not done when nothing had been logged on it by hand', () => {
    expect(unlinking(linked).session).toEqual({ doneMeters: null, doneSeconds: null });
  });

  it('gives the Session back what had been logged on it by hand before the link', () => {
    const overHandLogged = { ...linked, handLoggedMeters: 5000, handLoggedSeconds: 1500 };
    expect(unlinking(overHandLogged).session).toEqual({ doneMeters: 5000, doneSeconds: 1500 });
  });

  it('undoes linking, whatever had been logged by hand', () => {
    const notDone = session('thu19', 'p1', 'vma', 1, 3);
    const loggedByHand = session('thu19', 'p1', 'vma', 1, 3, { meters: 5000, seconds: 1500 });
    for (const before of [notDone, loggedByHand]) {
      const { activity } = linking(run('a', '2026-11-19T18:00:00+01:00'), before);
      expect(unlinking({ ...run('a', '2026-11-19T18:00:00+01:00'), ...activity }).session).toEqual({ doneMeters: before.doneMeters, doneSeconds: before.doneSeconds });
    }
  });
});
