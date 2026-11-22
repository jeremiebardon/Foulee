import { screen, userEvent } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import { seedDemo } from '@/db/seed';
import { saveBffToken } from '@/features/garmin';
import { createPlan } from '@/features/plans';
import { freezeToday } from '@/test/clock';
import { givenData, session } from '@/test/fakeRepositories';
import { footing, marathon, TODAY, tenK, tenKSessions, vma } from '@/test/fixtures';
import { DashboardScreen } from '..';

// Repositories are the mock seam (ADR 0003). The demo seed writes straight to the database
// layer, which cannot run under Jest either, so it is replaced the same way.
jest.mock('@/features/plans/plan.repository', () => jest.requireActual('@/test/fakeRepositories').fakePlanRepository());
jest.mock('@/features/workouts/workout.repository', () => jest.requireActual('@/test/fakeRepositories').fakeWorkoutRepository());
jest.mock('@/features/garmin/activity.repository', () => jest.requireActual('@/test/fakeRepositories').fakeActivityRepository());
jest.mock('@/db/seed', () => ({ seedDemo: jest.fn() }));
// The BFF access token lives in the Keychain / Keystore, absent under Jest.
jest.mock('expo-secure-store', () => jest.requireActual('@/test/memorySecureStore'));

// The variant comes from the env file Expo loads; tests set the same variable.
const original = process.env.EXPO_PUBLIC_APP_VARIANT;
beforeEach(() => freezeToday(TODAY));
afterEach(() => {
  // Assigning `undefined` would store the string "undefined": unset it instead.
  if (original === undefined) delete process.env.EXPO_PUBLIC_APP_VARIANT;
  else process.env.EXPO_PUBLIC_APP_VARIANT = original;
  jest.useRealTimers();
});

const renderDashboard = () =>
  renderRouter({ index: DashboardScreen, calendar: () => null, garmin: () => null, 'plans/[id]/edit': () => null, 'workouts/[id]': () => null }, { initialUrl: '/' });

const renderEmptyDashboardIn = (variant: 'development' | 'production') => {
  process.env.EXPO_PUBLIC_APP_VARIANT = variant;
  givenData({});
  return renderDashboard();
};

describe('dashboard without a plan', () => {
  it('loads the demo plan in development', async () => {
    const user = userEvent.setup();
    await renderEmptyDashboardIn('development');
    expect(screen.getByText('Créer un plan, ou charger un exemple pour découvrir l’app.')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Charger un exemple' }));
    expect(seedDemo).toHaveBeenCalled();
  });

  it('offers no demo plan in production, only creating a plan', async () => {
    await renderEmptyDashboardIn('production');
    expect(screen.getByText('Créer un plan pour commencer.')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Créer un plan' })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Charger un exemple' })).not.toBeOnTheScreen();
  });

  it('creates a plan and opens its editor', async () => {
    const user = userEvent.setup();
    await renderEmptyDashboardIn('production');
    await user.press(screen.getByRole('button', { name: 'Créer un plan' }));
    expect(createPlan).toHaveBeenCalled();
    expect(screen).toHavePathname('/plans/new-plan/edit');
  });
});

describe('dashboard of the selected plan', () => {
  beforeEach(() => givenData({ workouts: [footing, vma], plans: [tenK, marathon], sessions: tenKSessions }));

  it('compares this week with the plan', async () => {
    await renderDashboard();
    expect(screen.getByText('Cette semaine')).toBeOnTheScreen();
    expect(screen.getByText('0 / 4 km')).toBeOnTheScreen();
    expect(screen.getByText('0 séance(s) sur 1')).toBeOnTheScreen();
  });

  it('sums the last 28 days, the average pace and the adherence', async () => {
    await renderDashboard();
    expect(screen.getByText('8 km')).toBeOnTheScreen();
    expect(screen.getByText('1 sorties · 45 min')).toBeOnTheScreen();
    // 8,2 km in 45 min.
    expect(screen.getByText('5:29 /km')).toBeOnTheScreen();
    expect(screen.getByText('100 %')).toBeOnTheScreen();
    expect(screen.getByText('1 faites sur 1 prévues')).toBeOnTheScreen();
  });

  it('charts the weekly volume on a round scale', async () => {
    await renderDashboard();
    expect(screen.getByText('Volume par semaine')).toBeOnTheScreen();
    // The largest week, 8,2 km run, rounds up to 10 km.
    expect(screen.getByText('10 km')).toBeOnTheScreen();
    expect(screen.getByText('16 nov')).toBeOnTheScreen();
  });

  it('shows tomorrow’s session, and opens the calendar', async () => {
    const user = userEvent.setup();
    await renderDashboard();
    expect(screen.getByText('Demain')).toBeOnTheScreen();
    expect(screen.getByText('VMA 10 × 400')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Ouvrir le calendrier' }));
    expect(screen).toHavePathname('/calendar');
  });

  it('says when the next session is today', async () => {
    givenData({ workouts: [footing], plans: [tenK], sessions: [session('s3', 'p1', 'footing', 1, 2)] });
    await renderDashboard();
    expect(screen.getByText('Aujourd’hui')).toBeOnTheScreen();
  });

  it('dates a next session further away', async () => {
    givenData({ workouts: [footing], plans: [tenK], sessions: [session('s4', 'p1', 'footing', 2, 0)] });
    await renderDashboard();
    expect(screen.getByText('lundi 23 novembre')).toBeOnTheScreen();
  });

  it('counts Unplanned Activities in the totals, and a linked one once', async () => {
    const run = (garminActivityId: string, startTime: string, sessionId: string | null) => ({
      garminActivityId, startTime, distanceMeters: 6000, durationSeconds: 1800, averagePaceSecondsPerKm: 300, averageHeartRateBpm: null, sessionId, declinedSessionId: null,
    });
    givenData({
      workouts: [footing, vma],
      plans: [tenK, marathon],
      // s1 (8,2 km on the 10th) is completed by a Garmin Activity; Monday the 16th's 6 km are unplanned.
      sessions: tenKSessions,
      activities: [run('linked', '2026-11-10T07:00:00+01:00', 's1'), run('extra', '2026-11-16T07:00:00+01:00', null)],
    });
    await renderDashboard();
    expect(screen.getByText('6 / 4 km')).toBeOnTheScreen();
    expect(screen.getByText('2 sorties · 1 h 15')).toBeOnTheScreen();
    expect(screen.getByText('0 séance(s) sur 1')).toBeOnTheScreen();
  });

  it('shows dashes for a plan with nothing planned or run yet', async () => {
    givenData({ plans: [tenK] });
    await renderDashboard();
    expect(screen.getByText('0 / 0 km')).toBeOnTheScreen();
    expect(screen.getByText('— /km')).toBeOnTheScreen();
    expect(screen.getByText('— %')).toBeOnTheScreen();
    expect(screen.getByText('Plus aucune séance à venir dans ce plan.')).toBeOnTheScreen();
  });
});

describe('the Garmin import from the dashboard', () => {
  const originalUrl = process.env.EXPO_PUBLIC_BFF_URL;
  beforeEach(() => {
    process.env.EXPO_PUBLIC_BFF_URL = 'http://localhost:3000';
    saveBffToken('the-token');
  });
  afterEach(() => {
    if (originalUrl === undefined) delete process.env.EXPO_PUBLIC_BFF_URL;
    else process.env.EXPO_PUBLIC_BFF_URL = originalUrl;
  });

  it('opens from the dashboard of a plan once a BFF and a token are set', async () => {
    const user = userEvent.setup();
    givenData({ workouts: [footing, vma], plans: [tenK], sessions: tenKSessions });
    await renderDashboard();
    await user.press(screen.getByRole('button', { name: 'Importer depuis Garmin' }));
    expect(screen).toHavePathname('/garmin');
  });

  it('opens even before any plan exists', async () => {
    await renderEmptyDashboardIn('production');
    expect(screen.getByRole('button', { name: 'Importer depuis Garmin' })).toBeOnTheScreen();
  });

  it('is absent from a build without a BFF', async () => {
    delete process.env.EXPO_PUBLIC_BFF_URL;
    givenData({ workouts: [footing, vma], plans: [tenK], sessions: tenKSessions });
    await renderDashboard();
    expect(screen.queryByRole('button', { name: 'Importer depuis Garmin' })).not.toBeOnTheScreen();
  });
});
