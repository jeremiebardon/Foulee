import { screen, userEvent } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import { seedDemo } from '@/db/seed';
import { DashboardScreen } from './DashboardScreen';

// Repositories are the mock seam (ADR 0003). The demo seed writes straight to the database
// layer, which cannot run under Jest either, so it is replaced the same way.
jest.mock('@/features/plans/plan.repository', () => ({ usePlans: () => [], useSessionViews: () => [], createPlan: jest.fn(), selectPlan: jest.fn() }));
jest.mock('@/features/workouts/workout.repository', () => ({ useWorkouts: () => [] }));
jest.mock('@/db/seed', () => ({ seedDemo: jest.fn() }));

// The variant comes from the env file Expo loads; tests set the same variable.
const original = process.env.EXPO_PUBLIC_APP_VARIANT;
afterEach(() => {
  process.env.EXPO_PUBLIC_APP_VARIANT = original;
});

const renderEmptyDashboardIn = (variant: 'development' | 'production') => {
  process.env.EXPO_PUBLIC_APP_VARIANT = variant;
  return renderRouter({ index: DashboardScreen, 'plans/[id]/edit': () => null }, { initialUrl: '/' });
};

describe('dashboard without a plan', () => {
  it('loads the demo plan in development', async () => {
    const user = userEvent.setup();
    await renderEmptyDashboardIn('development');
    await user.press(screen.getByRole('button', { name: 'Charger un exemple' }));
    expect(seedDemo).toHaveBeenCalled();
  });

  it('offers no demo plan in production, only creating a plan', async () => {
    await renderEmptyDashboardIn('production');
    expect(screen.getByRole('button', { name: 'Créer un plan' })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Charger un exemple' })).not.toBeOnTheScreen();
  });
});
