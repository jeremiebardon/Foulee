import { screen, userEvent } from '@testing-library/react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { renderRouter, testRouter } from 'expo-router/testing-library';
import { answerAlert, lastAlert, watchAlerts } from '@/test/alert';
import { givenData } from '@/test/fakeRepositories';
import type { Workout } from './workout';
import { deleteWorkout, saveWorkout } from './workout.repository';
import { WorkoutEditorScreen } from './WorkoutEditorScreen';

jest.mock('./workout.repository', () => jest.requireActual('@/test/fakeRepositories').fakeWorkoutRepository());
// Native module: Jest has no UUID generator behind it, so new workouts get a known id.
jest.mock('expo-crypto', () => ({ randomUUID: () => 'new-workout' }));

const tempo: Workout = { id: 'w1', name: 'Seuil', category: 'tempo', items: [{ kind: 'run', measure: { type: 'distance', meters: 3000 }, pace: 265 }] };

const Edit = () => <WorkoutEditorScreen id={useLocalSearchParams<{ id: string }>().id} />;

/** The editor opened from the workout list, so leaving it goes back there. */
async function openEditor(path: string) {
  await renderRouter(
    { _layout: () => <Stack />, 'workouts/index': () => null, 'workouts/new': () => <WorkoutEditorScreen id="new" />, 'workouts/[id]/edit': Edit },
    { initialUrl: '/workouts' },
  );
  await testRouter.push(path);
}

describe('workout editor, new workout', () => {
  beforeEach(() => givenData({ workouts: [] }));

  it('starts empty, without a delete button', async () => {
    await openEditor('/workouts/new');
    expect(screen.getByLabelText('Nom')).toHaveDisplayValue('');
    expect(screen.getByText('Aucune étape')).toBeOnTheScreen();
    expect(screen.getByText('—')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Supprimer' })).not.toBeOnTheScreen();
  });

  it('refuses to save without a name or a step', async () => {
    const user = userEvent.setup();
    await openEditor('/workouts/new');
    await user.press(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(screen.getByText('Donner un nom à l’entraînement.')).toBeOnTheScreen();
    expect(screen.getByText('Ajouter au moins une étape.')).toBeOnTheScreen();
    expect(saveWorkout).not.toHaveBeenCalled();
    expect(screen).toHavePathname('/workouts/new');
  });

  it('saves a named workout with one paced step, then goes back', async () => {
    const user = userEvent.setup();
    await openEditor('/workouts/new');
    await user.type(screen.getByLabelText('Nom'), '  Sortie du dimanche ');
    await user.press(screen.getByRole('radio', { name: 'Sortie longue' }));
    await user.press(screen.getByRole('button', { name: 'Étape' }));
    // Pasting replaces the prefilled text, like selecting it all and typing over it.
    await user.paste(screen.getByLabelText('Distance'), '16');
    await user.type(screen.getByLabelText('Allure cible (/km)'), "5'50");

    // Values are reformatted once the field is left.
    expect(screen.getByLabelText('Distance')).toHaveDisplayValue('16 km');
    expect(screen.getByLabelText('Allure cible (/km)')).toHaveDisplayValue('5:50');
    expect(screen.getByText('16 km à 5:50/km')).toBeOnTheScreen();
    expect(screen.getByText('16 km · 1 h 33')).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(saveWorkout).toHaveBeenCalledWith({
      id: 'new-workout',
      name: 'Sortie du dimanche',
      category: 'long',
      items: [{ kind: 'run', measure: { type: 'distance', meters: 16000 }, pace: 350 }],
    });
    expect(screen).toHavePathname('/workouts');
  });

  it('builds a repeat block: repetitions, extra step, timed step', async () => {
    const user = userEvent.setup();
    await openEditor('/workouts/new');
    await user.type(screen.getByLabelText('Nom'), 'VMA');
    await user.press(screen.getByRole('button', { name: 'Bloc répété' }));
    expect(screen.getByText('BLOC RÉPÉTÉ')).toBeOnTheScreen();
    expect(screen.getByText('4 × (400 m + 1 min de récupération)')).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Répétitions : plus' }));
    await user.press(screen.getByRole('button', { name: 'Ajouter une étape au bloc' }));
    // The new step of the block runs for a time instead of a distance.
    await user.press(screen.getAllByRole('radio', { name: 'Durée' })[2]);
    await user.paste(screen.getAllByLabelText('Durée (min:s)')[1], '2:30');
    expect(screen.getByText('5 × (400 m + 1 min de récupération + 2 min 30)')).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(saveWorkout).toHaveBeenCalledWith(expect.objectContaining({
      items: [{
        kind: 'repeat',
        count: 5,
        steps: [
          { kind: 'run', measure: { type: 'distance', meters: 400 } },
          { kind: 'recovery', measure: { type: 'time', seconds: 60 } },
          { kind: 'run', measure: { type: 'time', seconds: 150 } },
        ],
      }],
    }));
  });

  it('reorders and removes steps', async () => {
    const user = userEvent.setup();
    await openEditor('/workouts/new');
    await user.press(screen.getByRole('button', { name: 'Étape' }));
    await user.press(screen.getByRole('radio', { name: 'Échauffement' }));
    await user.press(screen.getByRole('button', { name: 'Bloc répété' }));
    expect(screen.getByText('1 km d\'échauffement + 4 × (400 m + 1 min de récupération)')).toBeOnTheScreen();

    // The first item cannot go up, the last cannot go down.
    const [firstUp] = screen.getAllByRole('button', { name: 'Monter' });
    const downs = screen.getAllByRole('button', { name: 'Descendre' });
    expect(firstUp).toBeDisabled();
    expect(downs.at(-1)).toBeDisabled();

    await user.press(downs[0]);
    expect(screen.getByText('4 × (400 m + 1 min de récupération) + 1 km d\'échauffement')).toBeOnTheScreen();
    // Inside the block: its second step moves up, then its first step is removed.
    await user.press(screen.getAllByRole('button', { name: 'Monter' })[1]);
    expect(screen.getByText('4 × (1 min de récupération + 400 m) + 1 km d\'échauffement')).toBeOnTheScreen();
    await user.press(screen.getAllByRole('button', { name: 'Supprimer l’étape' })[0]);
    expect(screen.getByText('4 × 400 m + 1 km d\'échauffement')).toBeOnTheScreen();
  });

  it('flags sizes and paces it cannot read, and blocks a step left without a size', async () => {
    const user = userEvent.setup();
    await openEditor('/workouts/new');
    await user.type(screen.getByLabelText('Nom'), 'Test');
    await user.press(screen.getByRole('button', { name: 'Étape' }));

    await user.paste(screen.getByLabelText('Distance'), 'loin');
    expect(screen.getByText('Ex. : 400 m, 2 km')).toBeOnTheScreen();
    // Unreadable text stays as typed instead of being reformatted.
    expect(screen.getByLabelText('Distance')).toHaveDisplayValue('loin');
    // An emptied distance is no distance at all.
    await user.clear(screen.getByLabelText('Distance'));
    expect(screen.getByLabelText('Distance')).toHaveDisplayValue('0 m');

    await user.type(screen.getByLabelText('Allure cible (/km)'), '1');
    expect(screen.getByText('Ex. : 4:30')).toBeOnTheScreen();
    await user.clear(screen.getByLabelText('Allure cible (/km)'));
    expect(screen.queryByText('Ex. : 4:30')).not.toBeOnTheScreen();

    await user.press(screen.getByRole('radio', { name: 'Durée' }));
    await user.paste(screen.getByLabelText('Durée (min:s)'), '0');
    expect(screen.getByText('Ex. : 1:30, 10:00')).toBeOnTheScreen();
    await user.clear(screen.getByLabelText('Durée (min:s)'));

    await user.press(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(screen.getByText('Chaque étape doit avoir une distance ou une durée valide.')).toBeOnTheScreen();
    expect(saveWorkout).not.toHaveBeenCalled();
  });

  it('switches a step back from a duration to a distance', async () => {
    const user = userEvent.setup();
    await openEditor('/workouts/new');
    await user.press(screen.getByRole('button', { name: 'Étape' }));
    await user.press(screen.getByRole('radio', { name: 'Durée' }));
    expect(screen.getByLabelText('Durée (min:s)')).toHaveDisplayValue('5:00');
    await user.press(screen.getByRole('radio', { name: 'Distance' }));
    expect(screen.getByLabelText('Distance')).toHaveDisplayValue('1 km');
  });

  it('blocks a repeat block left without a step', async () => {
    const user = userEvent.setup();
    await openEditor('/workouts/new');
    await user.type(screen.getByLabelText('Nom'), 'Vide');
    await user.press(screen.getByRole('button', { name: 'Bloc répété' }));
    // Remove both steps of the block; the block itself stays.
    await user.press(screen.getAllByRole('button', { name: 'Supprimer l’étape' })[0]);
    await user.press(screen.getAllByRole('button', { name: 'Supprimer l’étape' })[0]);
    await user.press(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(screen.getByText('Un bloc répété doit avoir au moins 1 répétition et 1 étape.')).toBeOnTheScreen();
  });
});

describe('workout editor, existing workout', () => {
  beforeEach(() => {
    givenData({ workouts: [tempo] });
    watchAlerts();
  });

  it('starts from the workout, and refuses to save it once its name is cleared', async () => {
    const user = userEvent.setup();
    await openEditor('/workouts/w1/edit');
    expect(screen.getByLabelText('Nom')).toHaveDisplayValue('Seuil');
    expect(screen.getByText('3 km à 4:25/km')).toBeOnTheScreen();
    await user.clear(screen.getByLabelText('Nom'));
    await user.press(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(screen.getByText('Donner un nom à l’entraînement.')).toBeOnTheScreen();
    expect(saveWorkout).not.toHaveBeenCalled();
  });

  it('saves changes under the same id', async () => {
    const user = userEvent.setup();
    await openEditor('/workouts/w1/edit');
    await user.press(screen.getByRole('radio', { name: 'Fractionné' }));
    await user.press(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(saveWorkout).toHaveBeenCalledWith({ ...tempo, category: 'intervals' });
  });

  it('deletes the workout once confirmed, then returns to the list', async () => {
    const user = userEvent.setup();
    await openEditor('/workouts/w1/edit');
    await user.press(screen.getByRole('button', { name: 'Supprimer' }));
    expect(lastAlert()).toEqual({ title: 'Supprimer cet entraînement ?', message: 'Il sera aussi retiré de tous les plans.', buttons: ['Annuler', 'Supprimer'] });
    expect(deleteWorkout).not.toHaveBeenCalled();

    await answerAlert('Supprimer');
    expect(deleteWorkout).toHaveBeenCalledWith('w1');
    expect(screen).toHavePathname('/workouts');
  });

  it('shows nothing for a workout that no longer exists', async () => {
    await openEditor('/workouts/gone/edit');
    expect(screen.queryByLabelText('Nom')).not.toBeOnTheScreen();
  });
});
