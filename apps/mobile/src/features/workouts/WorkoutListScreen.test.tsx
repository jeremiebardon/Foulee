import { screen, userEvent } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import type { Workout } from './workout';
import { useWorkouts } from './workout.repository';
import { WorkoutListScreen } from './WorkoutListScreen';

// The repository is the only mock seam (ADR 0003): everything else, UI kit and domain included, is real.
jest.mock('./workout.repository', () => ({ useWorkouts: jest.fn() }));
const givenWorkouts = (workouts: Workout[]) => jest.mocked(useWorkouts).mockReturnValue(workouts);

const intervals: Workout = {
  id: 'w1',
  name: '6 × 400',
  category: 'intervals',
  items: [{ kind: 'repeat', count: 6, steps: [{ kind: 'run', measure: { type: 'distance', meters: 400 }, pace: 230 }] }],
};

// The real screen inside an in-memory router, so navigation is observed through the URL.
const renderList = () => renderRouter({ 'workouts/index': WorkoutListScreen, 'workouts/new': () => null, 'workouts/[id]': () => null }, { initialUrl: '/workouts' });

describe('workout list', () => {
  it('explains what a workout is when there is none', async () => {
    givenWorkouts([]);
    await renderList();
    expect(screen.getByText('Aucun entraînement')).toBeOnTheScreen();
  });

  it('shows each workout with its description and totals', async () => {
    givenWorkouts([intervals]);
    await renderList();
    expect(screen.getByText('6 × 400')).toBeOnTheScreen();
    expect(screen.getByText('6 × 400 m à 3:50/km')).toBeOnTheScreen();
    expect(screen.getByText('2,4 km · 9 min 12')).toBeOnTheScreen();
    expect(screen.queryByText('Aucun entraînement')).not.toBeOnTheScreen();
  });

  it('opens the editor for a new workout', async () => {
    const user = userEvent.setup();
    givenWorkouts([]);
    await renderList();
    await user.press(screen.getByRole('button', { name: 'Nouvel entraînement' }));
    expect(screen).toHavePathname('/workouts/new');
  });

  it('opens a workout’s detail when it is pressed', async () => {
    const user = userEvent.setup();
    givenWorkouts([intervals]);
    await renderList();
    await user.press(screen.getByText('6 × 400'));
    expect(screen).toHavePathname('/workouts/w1');
  });
});
