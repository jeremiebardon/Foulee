import { screen, userEvent } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import { seedDemo } from '@/db/seed';
import { createPlan } from '@/features/plans';
import { freezeToday } from '@/test/clock';
import { givenData, session } from '@/test/fakeRepositories';
import { footing, marathon, TODAY, tenK, tenKSessions, vma } from '@/test/fixtures';
import { DashboardScreen } from '..';

// Repositories are the mock seam (ADR 0003). The demo seed writes straight to the database
// layer, which cannot run under Jest either, so it is replaced the same way.
jest.mock('@/features/plans/plan.repository', () => jest.requireActual('@/test/fakeRepositories').fakePlanRepository());
jest.mock('@/features/workouts/workout.repository', () => jest.requireActual('@/test/fakeRepositories').fakeWorkoutRepository());
jest.mock('@/db/seed', () => ({ seedDemo: jest.fn() }));

// The variant comes from the env file Expo loads; tests set the same variable.
const original = process.env.EXPO_PUBLIC_APP_VARIANT;
beforeEach(() => freezeToday(TODAY));
afterEach(() => {
  process.env.EXPO_PUBLIC_APP_VARIANT = original;
  jest.useRealTimers();
});

const renderDashboard = () =>
  renderRouter({ index: DashboardScreen, calendar: () => null, 'plans/[id]/edit': () => null, 'workouts/[id]': () => null }, { initialUrl: '/' });

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

  it('shows dashes for a plan with nothing planned or run yet', async () => {
    givenData({ plans: [tenK] });
    await renderDashboard();
    expect(screen.getByText('0 / 0 km')).toBeOnTheScreen();
    expect(screen.getByText('— /km')).toBeOnTheScreen();
    expect(screen.getByText('— %')).toBeOnTheScreen();
    expect(screen.getByText('Plus aucune séance à venir dans ce plan.')).toBeOnTheScreen();
  });
});
