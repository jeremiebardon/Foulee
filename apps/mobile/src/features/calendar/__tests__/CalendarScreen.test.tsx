import { screen, userEvent } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import { logRun } from '@/features/plans';
import { freezeToday } from '@/test/clock';
import { givenData } from '@/test/fakeRepositories';
import { footing, marathon, TODAY, tenK, tenKSessions, vma } from '@/test/fixtures';
import { CalendarScreen } from '..';

// Repositories are the one mock seam (ADR 0003): the calendar reads plans and workouts through them.
jest.mock('@/features/plans/plan.repository', () => jest.requireActual('@/test/fakeRepositories').fakePlanRepository());
jest.mock('@/features/workouts/workout.repository', () => jest.requireActual('@/test/fakeRepositories').fakeWorkoutRepository());

const renderCalendar = () => renderRouter({ calendar: CalendarScreen, 'workouts/[id]': () => null }, { initialUrl: '/calendar' });
const day = (label: string) => screen.getByRole('button', { name: label });

beforeEach(() => {
  freezeToday(TODAY);
  givenData({ workouts: [footing, vma], plans: [tenK, marathon], sessions: tenKSessions });
});
afterEach(() => jest.useRealTimers());

describe('calendar', () => {
  it('asks for a plan when none is selected', async () => {
    givenData({ plans: [{ ...tenK, selected: false }] });
    await renderCalendar();
    expect(screen.getByText('Aucun plan')).toBeOnTheScreen();
  });

  it('opens on today, in the current month, with a picker for the plan shown', async () => {
    await renderCalendar();
    expect(screen.getByText('novembre 2026')).toBeOnTheScreen();
    expect(day('mercredi 18 novembre')).toBeSelected();
    expect(screen.getByText('mercredi 18 novembre')).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: 'Objectif 10 km' })).toBeSelected();
  });

  it('moves between months and back to today', async () => {
    const user = userEvent.setup();
    await renderCalendar();
    await user.press(screen.getByRole('button', { name: 'Mois précédent' }));
    expect(screen.getByText('octobre 2026')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Mois suivant' }));
    await user.press(screen.getByRole('button', { name: 'Mois suivant' }));
    expect(screen.getByText('décembre 2026')).toBeOnTheScreen();
    await user.press(day('lundi 7 décembre'));
    await user.press(screen.getByRole('button', { name: 'Aujourd’hui' }));
    expect(screen.getByText('novembre 2026')).toBeOnTheScreen();
    expect(day('mercredi 18 novembre')).toBeSelected();
  });

  it('tells rest days within the plan from days outside it', async () => {
    const user = userEvent.setup();
    await renderCalendar();
    expect(screen.getByText('Repos : aucune séance prévue.')).toBeOnTheScreen();
    // The grid ends with the first days of December, after the plan.
    await user.press(day('lundi 30 novembre'));
    expect(screen.getByText('En dehors du plan.')).toBeOnTheScreen();
  });

  it('shows a planned session of the selected day, to be marked as done', async () => {
    const user = userEvent.setup();
    await renderCalendar();
    await user.press(day('jeudi 19 novembre'));
    expect(screen.getByText('jeudi 19 novembre')).toBeOnTheScreen();
    expect(screen.getByText('VMA 10 × 400')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Marquer comme faite' })).toBeOnTheScreen();
  });

  it('shows what was run on a done session, and can mark it as not done', async () => {
    const user = userEvent.setup();
    await renderCalendar();
    await user.press(day('mardi 10 novembre'));
    // 8,2 km in 45 min = 5:29/km.
    expect(screen.getByText('✓ Faite : 8,2 km en 45:00 · 5:29/km')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Marquer non faite' }));
    expect(logRun).toHaveBeenCalledWith('s1', null);
  });
});

describe('log-run sheet', () => {
  it('is prefilled with the plan, and records what was really run', async () => {
    const user = userEvent.setup();
    await renderCalendar();
    await user.press(day('jeudi 19 novembre'));
    await user.press(screen.getByRole('button', { name: 'Marquer comme faite' }));
    expect(screen.getByText('Ajuster avec ce qui a été réellement couru.')).toBeOnTheScreen();
    expect(screen.getByLabelText('Distance (km)')).toHaveDisplayValue('4');
    expect(screen.getByLabelText('Durée (min:s)')).toHaveDisplayValue('15:20');

    await user.paste(screen.getByLabelText('Distance (km)'), '4,2');
    await user.paste(screen.getByLabelText('Durée (min:s)'), '16:05');
    await user.press(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(logRun).toHaveBeenCalledWith('s2', { meters: 4200, seconds: 965 });
    expect(screen.queryByText('Ajuster avec ce qui a été réellement couru.')).not.toBeOnTheScreen();
  });

  it('is prefilled with what was run when editing a done session', async () => {
    const user = userEvent.setup();
    await renderCalendar();
    await user.press(day('mardi 10 novembre'));
    await user.press(screen.getByRole('button', { name: 'Modifier' }));
    expect(screen.getByLabelText('Distance (km)')).toHaveDisplayValue('8,2');
    expect(screen.getByLabelText('Durée (min:s)')).toHaveDisplayValue('45:00');
  });

  it('refuses a distance or a time it cannot read', async () => {
    const user = userEvent.setup();
    await renderCalendar();
    await user.press(day('jeudi 19 novembre'));
    await user.press(screen.getByRole('button', { name: 'Marquer comme faite' }));
    await user.paste(screen.getByLabelText('Distance (km)'), 'loin');
    await user.paste(screen.getByLabelText('Durée (min:s)'), 'long');
    expect(screen.getByText('Ex. : 8,5')).toBeOnTheScreen();
    expect(screen.getByText('Ex. : 52:30')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Enregistrer' })).toBeDisabled();
  });

  it('closes without recording anything', async () => {
    const user = userEvent.setup();
    await renderCalendar();
    await user.press(day('jeudi 19 novembre'));
    await user.press(screen.getByRole('button', { name: 'Marquer comme faite' }));
    await user.press(screen.getByRole('button', { name: 'Fermer' }));
    expect(screen.queryByLabelText('Distance (km)')).not.toBeOnTheScreen();
    expect(logRun).not.toHaveBeenCalled();
  });
});
