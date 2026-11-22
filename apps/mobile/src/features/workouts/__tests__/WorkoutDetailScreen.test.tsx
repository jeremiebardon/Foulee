import { screen, userEvent } from '@testing-library/react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { renderRouter } from 'expo-router/testing-library';
import { givenData } from '@/test/fakeRepositories';
import type { Workout } from '../workout';
import { WorkoutDetailScreen } from '../WorkoutDetailScreen';

jest.mock('../workout.repository', () => jest.requireActual('@/test/fakeRepositories').fakeWorkoutRepository());

const vma: Workout = {
  id: 'w1',
  name: 'VMA courte',
  category: 'intervals',
  items: [
    { kind: 'warmup', measure: { type: 'time', seconds: 900 } },
    { kind: 'repeat', count: 6, steps: [{ kind: 'run', measure: { type: 'distance', meters: 400 }, pace: 230 }, { kind: 'recovery', measure: { type: 'time', seconds: 60 } }] },
    { kind: 'cooldown', measure: { type: 'distance', meters: 2000 }, pace: 375 },
  ],
};

const Detail = () => <WorkoutDetailScreen id={useLocalSearchParams<{ id: string }>().id} />;
const renderDetail = (id = 'w1') =>
  renderRouter({ _layout: () => <Stack />, 'workouts/[id]/index': Detail, 'workouts/[id]/edit': () => null }, { initialUrl: `/workouts/${id}` });

describe('workout detail', () => {
  beforeEach(() => givenData({ workouts: [vma] }));

  it('titles the screen with the workout and sums it up', async () => {
    await renderDetail();
    expect(screen.getAllByText('VMA courte').length).toBeGreaterThan(0);
    expect(screen.getByText('Fractionné')).toBeOnTheScreen();
    // 15 min at the default warm-up pace (6:00/km) = 2,5 km; 6 × (92 s + 60 s ≈ 154 m); 2 km in 12:30.
    expect(screen.getByText('≈ 7,82 km · 43 min')).toBeOnTheScreen();
  });

  it('lists each step as it will be run, with its estimate', async () => {
    await renderDetail();
    expect(screen.getByText('6 ×')).toBeOnTheScreen();
    // A timed step without a pace is estimated from the default pace.
    expect(screen.getByText('Échauffement')).toBeOnTheScreen();
    expect(screen.getByText('≈ 2,5 km')).toBeOnTheScreen();
    expect(screen.getByText(' à 3:50/km')).toBeOnTheScreen();
    expect(screen.getAllByText(' allure libre')).toHaveLength(2);
    expect(screen.getByText('≈ 1 min 32')).toBeOnTheScreen();
    expect(screen.getByText('Retour au calme')).toBeOnTheScreen();
    expect(screen.getByText(' à 6:15/km')).toBeOnTheScreen();
  });

  it('opens the editor from its button', async () => {
    const user = userEvent.setup();
    await renderDetail();
    await user.press(screen.getByRole('button', { name: 'Modifier l’entraînement' }));
    expect(screen).toHavePathname('/workouts/w1/edit');
  });

  it('opens the editor from the header', async () => {
    const user = userEvent.setup();
    await renderDetail();
    await user.press(screen.getByRole('button', { name: 'Modifier' }));
    expect(screen).toHavePathname('/workouts/w1/edit');
  });

  it('shows nothing for a workout that no longer exists', async () => {
    await renderDetail('gone');
    expect(screen.queryByText('Déroulé')).not.toBeOnTheScreen();
  });
});
