import { screen, userEvent } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import { givenData } from '@/test/fakeRepositories';
import { footing, marathon, tenK, tenKSessions, vma } from '@/test/fixtures';
import { createPlan } from '../../data/plan.repository';
import { PlanListScreen } from '../PlanListScreen';

// Repositories are the one mock seam (ADR 0003): this feature's, and the workouts one it reads through.
jest.mock('../../data/plan.repository', () => jest.requireActual('@/test/fakeRepositories').fakePlanRepository());
jest.mock('@/features/workouts/data/workout.repository', () => jest.requireActual('@/test/fakeRepositories').fakeWorkoutRepository());

const renderList = () =>
  renderRouter({ 'plans/index': PlanListScreen, 'plans/[id]/index': () => null, 'plans/[id]/edit': () => null }, { initialUrl: '/plans' });

describe('plan list', () => {
  it('explains what a plan is when there is none', async () => {
    givenData({});
    await renderList();
    expect(screen.getByText('Aucun plan')).toBeOnTheScreen();
  });

  it('shows each plan with its dates, length and planned volume, marking the selected one', async () => {
    givenData({ workouts: [footing, vma], plans: [tenK, marathon], sessions: tenKSessions });
    await renderList();
    expect(screen.getByText('Objectif 10 km')).toBeOnTheScreen();
    expect(screen.getByText('9 nov. → 29 nov. · 3 sem. · 12 km')).toBeOnTheScreen();
    expect(screen.getByText('7 déc. → 20 déc. · 2 sem. · 0 km')).toBeOnTheScreen();
    expect(screen.getAllByText('Sélectionné')).toHaveLength(1);
    expect(screen.queryByText('Aucun plan')).not.toBeOnTheScreen();
  });

  it('creates a plan and opens its editor', async () => {
    const user = userEvent.setup();
    givenData({});
    await renderList();
    await user.press(screen.getByRole('button', { name: 'Nouveau plan' }));
    expect(createPlan).toHaveBeenCalled();
    expect(screen).toHavePathname('/plans/new-plan/edit');
  });

  it('opens a plan when it is pressed', async () => {
    const user = userEvent.setup();
    givenData({ plans: [tenK, marathon] });
    await renderList();
    await user.press(screen.getByText('Marathon'));
    expect(screen).toHavePathname('/plans/p2');
  });
});
