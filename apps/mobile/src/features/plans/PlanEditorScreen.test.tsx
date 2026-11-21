import { screen, userEvent } from '@testing-library/react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { renderRouter, testRouter } from 'expo-router/testing-library';
import { answerAlert, lastAlert, watchAlerts } from '@/test/alert';
import { freezeToday } from '@/test/clock';
import { givenData } from '@/test/fakeRepositories';
import { footing, marathon, TODAY, tenK, tenKSessions, vma } from '@/test/fixtures';
import { PlanEditorScreen } from './PlanEditorScreen';
import { addSession, copyPlanWeek, deletePlan, removeSession, selectPlan, updatePlan } from './plan.repository';

// Repositories are the one mock seam (ADR 0003): this feature's, and the workouts one it reads through.
jest.mock('./plan.repository', () => jest.requireActual('@/test/fakeRepositories').fakePlanRepository());
jest.mock('@/features/workouts/workout.repository', () => jest.requireActual('@/test/fakeRepositories').fakeWorkoutRepository());

const Edit = () => <PlanEditorScreen id={useLocalSearchParams<{ id: string }>().id} />;

/** The editor opened from the plan list, so leaving it goes back there. */
async function openEditor(id: string) {
  await renderRouter(
    { _layout: () => <Stack />, 'plans/index': () => null, 'plans/[id]/edit': Edit, 'workouts/new': () => null },
    { initialUrl: '/plans' },
  );
  await testRouter.push(`/plans/${id}/edit`);
}

beforeEach(() => {
  freezeToday(TODAY);
  watchAlerts();
  givenData({ workouts: [footing, vma], plans: [tenK, marathon], sessions: tenKSessions });
});
afterEach(() => jest.useRealTimers());

describe('plan editor, settings', () => {
  it('renames the plan as it is typed', async () => {
    const user = userEvent.setup();
    await openEditor('p1');
    expect(screen.getByLabelText('Nom du plan')).toHaveDisplayValue('Objectif 10 km');
    await user.type(screen.getByLabelText('Nom du plan'), ' !');
    expect(updatePlan).toHaveBeenLastCalledWith('p1', { name: 'Objectif 10 km !' });
  });

  it('moves the start by whole weeks, relative to this Monday', async () => {
    const user = userEvent.setup();
    await openEditor('p1');
    expect(screen.getByText('lun. 9 nov.')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Début : plus' }));
    expect(updatePlan).toHaveBeenCalledWith('p1', { startDate: '2026-11-16' });
    await user.press(screen.getByRole('button', { name: 'Début : moins' }));
    expect(updatePlan).toHaveBeenCalledWith('p1', { startDate: '2026-11-02' });
  });

  it('changes the number of weeks', async () => {
    const user = userEvent.setup();
    await openEditor('p1');
    await user.press(screen.getByRole('button', { name: 'Semaines : plus' }));
    expect(updatePlan).toHaveBeenCalledWith('p1', { weeks: 4 });
  });

  it('says when the plan is the one in the calendar', async () => {
    await openEditor('p1');
    expect(screen.getByText('Plan affiché dans le calendrier')).toBeOnTheScreen();
  });

  it('shows another plan in the calendar on request', async () => {
    const user = userEvent.setup();
    await openEditor('p2');
    await user.press(screen.getByRole('button', { name: 'Afficher dans le calendrier' }));
    expect(selectPlan).toHaveBeenCalledWith('p2');
  });

  it('deletes the plan once confirmed, then returns to the list', async () => {
    const user = userEvent.setup();
    await openEditor('p1');
    await user.press(screen.getByRole('button', { name: 'Supprimer' }));
    expect(lastAlert()).toEqual({
      title: 'Supprimer ce plan ?',
      message: 'Ses séances seront supprimées. Les entraînements restent disponibles.',
      buttons: ['Annuler', 'Supprimer'],
    });
    await answerAlert('Supprimer');
    expect(deletePlan).toHaveBeenCalledWith('p1');
    expect(screen).toHavePathname('/plans');
  });

  it('shows nothing for a plan that no longer exists', async () => {
    await openEditor('gone');
    expect(screen.queryByLabelText('Nom du plan')).not.toBeOnTheScreen();
  });
});

describe('plan editor, weeks', () => {
  it('opens on the current week, with its dates and volume', async () => {
    await openEditor('p1');
    expect(screen.getByRole('tab', { name: 'S2' })).toBeSelected();
    expect(screen.getByText('Semaine 2')).toBeOnTheScreen();
    expect(screen.getByText('16 nov. → 22 nov. · 4 km')).toBeOnTheScreen();
  });

  it('switches week from the week strip', async () => {
    const user = userEvent.setup();
    await openEditor('p1');
    await user.press(screen.getByRole('tab', { name: 'S1' }));
    expect(screen.getByRole('tab', { name: 'S1' })).toBeSelected();
    expect(screen.getByText('9 nov. → 15 nov. · 8 km')).toBeOnTheScreen();
  });

  it('copies a week onto the next one, or onto all the following ones', async () => {
    const user = userEvent.setup();
    await openEditor('p1');
    await user.press(screen.getByRole('tab', { name: 'S1' }));
    await user.press(screen.getByRole('button', { name: 'Copier vers S2' }));
    expect(copyPlanWeek).toHaveBeenCalledWith('p1', 0, [1]);
    await user.press(screen.getByRole('button', { name: 'Copier vers la suite' }));
    expect(copyPlanWeek).toHaveBeenCalledWith('p1', 0, [1, 2]);
  });

  it('has nothing to copy onto from the last week', async () => {
    const user = userEvent.setup();
    await openEditor('p1');
    await user.press(screen.getByRole('tab', { name: 'S3' }));
    expect(screen.getByText('Semaine 3')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Copier vers la suite' })).not.toBeOnTheScreen();
  });
});

describe('plan editor, sessions', () => {
  it('lists the days of the week with their sessions', async () => {
    await openEditor('p1');
    expect(screen.getByText('Lundi')).toBeOnTheScreen();
    expect(screen.getByText('16 nov.')).toBeOnTheScreen();
    expect(screen.getByText('Dimanche')).toBeOnTheScreen();
    expect(screen.getByText('VMA 10 × 400')).toBeOnTheScreen();
  });

  it('removes a session', async () => {
    const user = userEvent.setup();
    await openEditor('p1');
    await user.press(screen.getByRole('button', { name: 'Retirer VMA 10 × 400' }));
    expect(removeSession).toHaveBeenCalledWith('s2');
  });

  it('adds a workout on the chosen day', async () => {
    const user = userEvent.setup();
    await openEditor('p1');
    // Wednesday is the third day.
    await user.press(screen.getAllByRole('button', { name: 'Ajouter' })[2]);
    expect(screen.getByText('Mercredi · semaine 2')).toBeOnTheScreen();
    await user.press(screen.getByText('Footing 8 km'));
    expect(addSession).toHaveBeenCalledWith({ planId: 'p1', workoutId: 'footing', week: 1, day: 2 });
    expect(screen.queryByText('Mercredi · semaine 2')).not.toBeOnTheScreen();
  });

  it('closes the workout picker without adding anything', async () => {
    const user = userEvent.setup();
    await openEditor('p1');
    await user.press(screen.getAllByRole('button', { name: 'Ajouter' })[0]);
    await user.press(screen.getByRole('button', { name: 'Fermer' }));
    expect(screen.queryByText('Lundi · semaine 2')).not.toBeOnTheScreen();
    expect(addSession).not.toHaveBeenCalled();
  });

  it('offers to create a workout when there is none to add', async () => {
    const user = userEvent.setup();
    givenData({ plans: [tenK] });
    await openEditor('p1');
    await user.press(screen.getAllByRole('button', { name: 'Ajouter' })[0]);
    await user.press(screen.getByRole('button', { name: 'Créer un entraînement' }));
    expect(screen).toHavePathname('/workouts/new');
  });
});
