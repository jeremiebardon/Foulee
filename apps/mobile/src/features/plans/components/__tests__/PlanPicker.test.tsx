import { render, screen, userEvent } from '@testing-library/react-native';
import { givenData } from '@/test/fakeRepositories';
import { marathon, tenK } from '@/test/fixtures';
import { selectPlan } from '../../data/plan.repository';
import { PlanPicker } from '../PlanPicker';

jest.mock('../../data/plan.repository', () => jest.requireActual('@/test/fakeRepositories').fakePlanRepository());

describe('plan picker', () => {
  it('lets the user pick the plan to show among several', async () => {
    const user = userEvent.setup();
    givenData({ plans: [tenK, marathon] });
    await render(<PlanPicker />);
    expect(screen.getByRole('radio', { name: 'Objectif 10 km' })).toBeSelected();
    expect(screen.getByRole('radio', { name: 'Marathon' })).not.toBeSelected();
    await user.press(screen.getByRole('radio', { name: 'Marathon' }));
    expect(selectPlan).toHaveBeenCalledWith('p2');
  });

  it('stays hidden with a single plan', async () => {
    givenData({ plans: [tenK] });
    await render(<PlanPicker />);
    expect(screen.queryByRole('radio')).not.toBeOnTheScreen();
  });

  it('stays hidden while no plan is selected', async () => {
    givenData({ plans: [{ ...tenK, selected: false }, marathon] });
    await render(<PlanPicker />);
    expect(screen.queryByRole('radio')).not.toBeOnTheScreen();
  });
});
