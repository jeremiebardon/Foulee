import { screen, userEvent, within } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import { givenData, session } from '@/test/fakeRepositories';
import { footing, marathon, tenK, tenKSessions, vma } from '@/test/fixtures';
import type { Activity } from '../../domain/activity';
import { declineSuggestion, linkActivity, unlinkActivity } from '../../data/activity.repository';
import { ActivityImportScreen } from '../ActivityImportScreen';
import { fetchActivitiesSince } from '../../data/bff.api';
import { saveBffToken } from '../../data/bffAccess.store';

// The mock seams of screen tests (ADR 0003): the repositories, and the BFF client, which finds nothing new.
jest.mock('../../data/activity.repository', () => jest.requireActual('@/test/fakeRepositories').fakeActivityRepository());
jest.mock('@/features/plans/data/plan.repository', () => jest.requireActual('@/test/fakeRepositories').fakePlanRepository());
jest.mock('@/features/workouts/data/workout.repository', () => jest.requireActual('@/test/fakeRepositories').fakeWorkoutRepository());
jest.mock('../../data/bff.api', () => ({ ...jest.requireActual('../../data/bff.api'), fetchActivitiesSince: jest.fn() }));
jest.mock('expo-secure-store', () => jest.requireActual('@/test/memorySecureStore'));

const original = process.env.EXPO_PUBLIC_BFF_URL;
beforeEach(() => {
  process.env.EXPO_PUBLIC_BFF_URL = 'http://localhost:3000';
  saveBffToken('the-token');
  jest.mocked(fetchActivitiesSince).mockResolvedValue({ activities: [], nextCursor: null });
});
afterEach(() => {
  if (original === undefined) delete process.env.EXPO_PUBLIC_BFF_URL;
  else process.env.EXPO_PUBLIC_BFF_URL = original;
});

const activity = (garminActivityId: string, startTime: string, more: Partial<Activity> = {}): Activity => ({
  garminActivityId,
  startTime,
  distanceMeters: 4100,
  durationSeconds: 960,
  averagePaceSecondsPerKm: 234,
  averageHeartRateBpm: null,
  sessionId: null,
  declinedSessionId: null,
  handLoggedMeters: null,
  handLoggedSeconds: null,
  ...more,
});
/** Thursday 19 November, the day « VMA 10 × 400 » (s2) is planned in « Objectif 10 km ». */
const thursdayRun = activity('1002', '2026-11-19T18:00:00+01:00');
/** Wednesday 18 November, a rest day. */
const wednesdayRun = activity('1003', '2026-11-18T07:00:00+01:00');

const given = (activities: Activity[], plans = [tenK, marathon]) => givenData({ workouts: [footing, vma], plans, sessions: tenKSessions, activities });

async function renderImport() {
  await renderRouter({ garmin: ActivityImportScreen, settings: () => null }, { initialUrl: '/garmin' });
  await screen.findByText('Aucune nouvelle activité.');
}

const card = (garminActivityId: string) => within(screen.getByTestId(`garmin-activity-${garminActivityId}`));

describe('the suggested Session', () => {
  it('is the one planned the day of the run; confirming it completes the Session with the run', async () => {
    const user = userEvent.setup();
    given([thursdayRun]);
    await renderImport();

    expect(card('1002').getByText('Séance prévue ce jour : VMA 10 × 400')).toBeOnTheScreen();
    await user.press(card('1002').getByRole('button', { name: 'Lier à cette séance' }));

    expect(linkActivity).toHaveBeenCalledWith(thursdayRun, 's2');
    expect(card('1002').getByText('✓ VMA 10 × 400 · jeudi 19 novembre')).toBeOnTheScreen();
    expect(card('1002').queryByText(/Séance prévue ce jour/)).not.toBeOnTheScreen();
  });

  it('can be declined: the run stays an Unplanned Activity and is not suggested again', async () => {
    const user = userEvent.setup();
    given([thursdayRun]);
    await renderImport();

    await user.press(card('1002').getByRole('button', { name: 'Refuser' }));

    expect(declineSuggestion).toHaveBeenCalledWith(thursdayRun, 's2');
    expect(linkActivity).not.toHaveBeenCalled();
    expect(card('1002').getByText('Activité non planifiée')).toBeOnTheScreen();
    expect(card('1002').queryByText(/Séance prévue ce jour/)).not.toBeOnTheScreen();
  });

  it('is none on a rest day', async () => {
    given([wednesdayRun]);
    await renderImport();
    expect(card('1003').getByText('Activité non planifiée')).toBeOnTheScreen();
    expect(card('1003').queryByRole('button', { name: 'Lier à cette séance' })).not.toBeOnTheScreen();
  });
});

describe('linking by hand', () => {
  it('links the run to any Session of the selected Plan, nearest its day first: a Session done a day late', async () => {
    const user = userEvent.setup();
    given([wednesdayRun]);
    await renderImport();

    await user.press(card('1003').getByRole('button', { name: 'Choisir une séance' }));
    const candidates = screen.getAllByTestId('activity-link-candidate');
    // Thursday the 19th is a day off, Tuesday the 10th eight days.
    expect(candidates.map((c) => within(c).getByTestId('session-workout-name').props.children)).toEqual(['VMA 10 × 400', 'Footing 8 km']);
    expect(within(candidates[0]).getByText('jeudi 19 novembre')).toBeOnTheScreen();

    await user.press(candidates[0]);

    expect(linkActivity).toHaveBeenCalledWith(wednesdayRun, 's2');
    expect(screen.queryByTestId('activity-link-candidate')).not.toBeOnTheScreen();
    expect(card('1003').getByText('✓ VMA 10 × 400 · jeudi 19 novembre')).toBeOnTheScreen();
  });

  it('offers no Session that another Activity completes', async () => {
    const user = userEvent.setup();
    given([wednesdayRun, activity('1001', '2026-11-10T07:00:00+01:00', { sessionId: 's1' })]);
    await renderImport();
    await user.press(card('1003').getByRole('button', { name: 'Choisir une séance' }));
    expect(screen.getAllByTestId('activity-link-candidate')).toHaveLength(1);
  });

  it('says so when the selected Plan has nothing to link, and closes without linking', async () => {
    const user = userEvent.setup();
    given([wednesdayRun], [{ ...tenK, selected: false }]);
    await renderImport();
    await user.press(card('1003').getByRole('button', { name: 'Choisir une séance' }));
    expect(screen.getByText('Aucune séance à lier dans le plan sélectionné.')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Fermer' }));
    expect(screen.queryByText('Aucune séance à lier dans le plan sélectionné.')).not.toBeOnTheScreen();
    expect(linkActivity).not.toHaveBeenCalled();
  });
});

describe('unlinking', () => {
  it('makes the run an Unplanned Activity again, without suggesting the same Session back', async () => {
    const user = userEvent.setup();
    const linked = { ...thursdayRun, sessionId: 's2' };
    givenData({ workouts: [footing, vma], plans: [tenK], sessions: [session('s2', 'p1', 'vma', 1, 3, { meters: 4100, seconds: 960 })], activities: [linked] });
    await renderImport();

    expect(card('1002').getByText('✓ VMA 10 × 400 · jeudi 19 novembre')).toBeOnTheScreen();
    await user.press(card('1002').getByRole('button', { name: 'Délier' }));

    expect(unlinkActivity).toHaveBeenCalledWith(linked);
    expect(card('1002').getByText('Activité non planifiée')).toBeOnTheScreen();
    expect(card('1002').queryByText(/Séance prévue ce jour/)).not.toBeOnTheScreen();
  });

  it('is offered even when the linked Session no longer shows in its Plan', async () => {
    given([{ ...thursdayRun, sessionId: 'gone' }]);
    await renderImport();
    expect(card('1002').getByText('✓ Liée à une séance qui n’est plus dans le plan')).toBeOnTheScreen();
    expect(card('1002').getByRole('button', { name: 'Délier' })).toBeOnTheScreen();
  });
});
