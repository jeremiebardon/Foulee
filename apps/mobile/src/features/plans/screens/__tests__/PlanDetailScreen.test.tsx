import { screen, userEvent } from '@testing-library/react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { renderRouter } from 'expo-router/testing-library';
import { freezeToday } from '@/test/clock';
import { givenData } from '@/test/fakeRepositories';
import { footing, marathon, TODAY, tenK, tenKSessions, vma } from '@/test/fixtures';
import { PlanDetailScreen } from '../PlanDetailScreen';
import { selectPlan } from '../../data/plan.repository';

// Repositories are the one mock seam (ADR 0003): this feature's, and the workouts one it reads through.
jest.mock('../../data/plan.repository', () => jest.requireActual('@/test/fakeRepositories').fakePlanRepository());
jest.mock('@/features/workouts/data/workout.repository', () => jest.requireActual('@/test/fakeRepositories').fakeWorkoutRepository());

const Detail = () => <PlanDetailScreen id={useLocalSearchParams<{ id: string }>().id} />;
const renderDetail = (id: string) =>
  renderRouter(
    { _layout: () => <Stack />, 'plans/[id]/index': Detail, 'plans/[id]/edit': () => null, 'workouts/[id]': () => null },
    { initialUrl: `/plans/${id}` },
  );

beforeEach(() => {
  freezeToday(TODAY);
  givenData({ workouts: [footing, vma], plans: [tenK, marathon], sessions: tenKSessions });
});
afterEach(() => jest.useRealTimers());

describe('plan detail', () => {
  it('sums the plan up: dates, volume and sessions done', async () => {
    await renderDetail('p1');
    expect(screen.getByText('9 nov. → 29 nov. · 3 semaines')).toBeOnTheScreen();
    expect(screen.getByText('12 km · 1/2 séances faites')).toBeOnTheScreen();
    expect(screen.getByText('Affiché dans le calendrier')).toBeOnTheScreen();
  });

  it('lists the plan week by week, with what was run and the rest weeks', async () => {
    await renderDetail('p1');
    expect(screen.getByText('Semaine 1')).toBeOnTheScreen();
    expect(screen.getByText('9 nov. → 15 nov. · 8 km')).toBeOnTheScreen();
    expect(screen.getByText('Mardi 10 nov.')).toBeOnTheScreen();
    expect(screen.getByText('✓ 8,2 km · 45 min')).toBeOnTheScreen();

    expect(screen.getByText('Jeudi 19 nov.')).toBeOnTheScreen();
    expect(screen.getByText('4 km · 15 min')).toBeOnTheScreen();

    expect(screen.getByText('23 nov. → 29 nov. · 0 km')).toBeOnTheScreen();
    expect(screen.getByText('Semaine de repos')).toBeOnTheScreen();
  });

  it('opens a session’s workout', async () => {
    const user = userEvent.setup();
    await renderDetail('p1');
    await user.press(screen.getByRole('button', { name: /VMA 10 × 400/ }));
    expect(screen).toHavePathname('/workouts/vma');
  });

  it('opens the editor from its button', async () => {
    const user = userEvent.setup();
    await renderDetail('p1');
    await user.press(screen.getByRole('button', { name: 'Modifier le plan' }));
    expect(screen).toHavePathname('/plans/p1/edit');
  });

  it('opens the editor from the header', async () => {
    const user = userEvent.setup();
    await renderDetail('p1');
    await user.press(screen.getByRole('button', { name: 'Modifier' }));
    expect(screen).toHavePathname('/plans/p1/edit');
  });

  it('shows another plan in the calendar on request', async () => {
    const user = userEvent.setup();
    await renderDetail('p2');
    await user.press(screen.getByRole('button', { name: 'Afficher dans le calendrier' }));
    expect(selectPlan).toHaveBeenCalledWith('p2');
  });

  it('shows nothing for a plan that no longer exists', async () => {
    await renderDetail('gone');
    expect(screen.queryByText('Semaine 1')).not.toBeOnTheScreen();
  });
});
