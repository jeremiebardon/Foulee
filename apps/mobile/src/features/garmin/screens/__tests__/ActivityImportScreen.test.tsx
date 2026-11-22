import { act, screen, userEvent } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import { givenData } from '@/test/fakeRepositories';
import { resetFakeServices } from '@/test/fakeServices';
import type { Activity } from '../../domain/activity';
import { saveImport } from '../../data/activity.repository';
import { ActivityImportScreen } from '../ActivityImportScreen';
import { BffError, fetchActivitiesSince, type ActivitiesPage } from '../../data/bff.api';
import { forgetBffToken, saveBffToken } from '../../data/bffAccess.store';
// The mock seams of screen tests: the repositories (ADR 0003) and the BFF client.
// The two mock seams of screen tests: the repository (ADR 0003) and the BFF client.
jest.mock('@/features/plans/data/plan.repository', () => jest.requireActual('@/test/fakeRepositories').fakePlanRepository());
jest.mock('@/features/workouts/data/workout.repository', () => jest.requireActual('@/test/fakeRepositories').fakeWorkoutRepository());
jest.mock('../../data/activity.repository', () => jest.requireActual('@/test/fakeRepositories').fakeActivityRepository());
jest.mock('../../data/bff.api', () => ({ ...jest.requireActual('../../data/bff.api'), fetchActivitiesSince: jest.fn() }));
jest.mock('@/shared/services', () => jest.requireActual('@/test/fakeServices').fakeServicesModule());

const original = process.env.EXPO_PUBLIC_BFF_URL;
beforeEach(() => {
  resetFakeServices();
  // clearMocks keeps queued answers: drop the ones a test left unused.
  jest.mocked(fetchActivitiesSince).mockReset();
  process.env.EXPO_PUBLIC_BFF_URL = 'http://localhost:3000';
  saveBffToken('the-token');
});
afterEach(() => {
  if (original === undefined) delete process.env.EXPO_PUBLIC_BFF_URL;
  else process.env.EXPO_PUBLIC_BFF_URL = original;
});

const activity = (garminActivityId: string, startTime: string, distanceMeters: number, durationSeconds: number, averageHeartRateBpm: number | null = null): Activity => ({
  garminActivityId,
  startTime,
  distanceMeters,
  durationSeconds,
  averagePaceSecondsPerKm: durationSeconds / (distanceMeters / 1000),
  averageHeartRateBpm,
  sessionId: null,
  declinedSessionId: null,
  handLoggedMeters: null,
  handLoggedSeconds: null,
});
/** Tuesday 17 November, 8 km in 44 min. */
const tuesdayRun = activity('1001', '2026-11-17T07:30:00+01:00', 8000, 2640, 148);
/** Thursday 19 November, 10,5 km in 52 min 30. */
const thursdayRun = activity('1002', '2026-11-19T18:00:00+01:00', 10500, 3150);

const bffServes = (...pages: ActivitiesPage[]) => pages.forEach((page) => jest.mocked(fetchActivitiesSince).mockResolvedValueOnce(page));
const bffFails = (reason: BffError['reason']) => jest.mocked(fetchActivitiesSince).mockRejectedValueOnce(new BffError(reason));

const renderImport = () =>
  renderRouter({ garmin: ActivityImportScreen, settings: () => null }, { initialUrl: '/garmin' });

const pullToRefresh = () => userEvent.setup().pullToRefresh(screen.getByTestId('garmin-import'));

describe('importing Activities', () => {
  it('fetches every Activity the first time the import opens, and lists them', async () => {
    givenData({});
    bffServes({ activities: [tuesdayRun], nextCursor: '2026-11-17T06:30:00.000Z' });
    await renderImport();

    expect(await screen.findByText('1 nouvelle activité.')).toBeOnTheScreen();
    expect(fetchActivitiesSince).toHaveBeenCalledWith({ bffUrl: 'http://localhost:3000', token: 'the-token' }, null);
    expect(screen.getByText('mardi 17 novembre')).toBeOnTheScreen();
    expect(screen.getByText('8 km · 44 min · 5:30/km · 148 bpm')).toBeOnTheScreen();
  });

  it('fetches only new Activities on pull-to-refresh, from the cursor of the last import, newest first', async () => {
    givenData({ activities: [tuesdayRun], importCursor: '2026-11-17T06:30:00.000Z' });
    bffServes({ activities: [], nextCursor: '2026-11-17T06:30:00.000Z' }, { activities: [thursdayRun], nextCursor: '2026-11-19T17:00:00.000Z' });
    await renderImport();
    expect(await screen.findByText('Aucune nouvelle activité.')).toBeOnTheScreen();

    await pullToRefresh();

    expect(await screen.findByText('1 nouvelle activité.')).toBeOnTheScreen();
    expect(fetchActivitiesSince).toHaveBeenLastCalledWith({ bffUrl: 'http://localhost:3000', token: 'the-token' }, '2026-11-17T06:30:00.000Z');
    expect(screen.getAllByText(/novembre$/).map((day) => day.props.children)).toEqual(['jeudi 19 novembre', 'mardi 17 novembre']);
    expect(screen.getByText('10,5 km · 53 min · 5:00/km')).toBeOnTheScreen();
  });

  it('never duplicates an Activity that is imported again', async () => {
    givenData({ activities: [tuesdayRun] });
    bffServes({ activities: [tuesdayRun, thursdayRun], nextCursor: '2026-11-19T17:00:00.000Z' });
    await renderImport();

    expect(await screen.findByText('1 nouvelle activité.')).toBeOnTheScreen();
    expect(screen.getAllByText(/novembre$/)).toHaveLength(2);
  });

  it('counts several new Activities', async () => {
    givenData({});
    bffServes({ activities: [tuesdayRun, thursdayRun], nextCursor: '2026-11-19T17:00:00.000Z' });
    await renderImport();
    expect(await screen.findByText('2 nouvelles activités.')).toBeOnTheScreen();
  });

  it('invites a first import when nothing is imported yet', async () => {
    givenData({});
    bffServes({ activities: [], nextCursor: null });
    await renderImport();
    expect(await screen.findByText('Aucune nouvelle activité.')).toBeOnTheScreen();
    expect(screen.getByText('Tirer vers le bas pour importer les sorties de la montre.')).toBeOnTheScreen();
  });

  it('runs one import at a time, however often the list is pulled', async () => {
    givenData({});
    let answer: (page: ActivitiesPage) => void = () => {};
    jest.mocked(fetchActivitiesSince).mockReturnValueOnce(new Promise((resolve) => (answer = resolve)));
    await renderImport();
    await pullToRefresh();
    expect(fetchActivitiesSince).toHaveBeenCalledTimes(1);
    await act(async () => answer({ activities: [], nextCursor: null }));
    expect(await screen.findByText('Aucune nouvelle activité.')).toBeOnTheScreen();
  });
});

describe('a failed import', () => {
  beforeEach(() => givenData({ activities: [tuesdayRun], importCursor: '2026-11-17T06:30:00.000Z' }));

  it('says the BFF is unreachable, and keeps what was already imported', async () => {
    bffFails('network');
    await renderImport();
    expect(await screen.findByText('BFF injoignable. Vérifier la connexion, puis tirer vers le bas pour réessayer.')).toBeOnTheScreen();
    expect(screen.getByText('mardi 17 novembre')).toBeOnTheScreen();
    expect(saveImport).not.toHaveBeenCalled();
  });

  it('says the BFF refused the access token, and leads to the settings', async () => {
    const user = userEvent.setup();
    bffFails('unauthorized');
    await renderImport();
    expect(await screen.findByText('Le BFF refuse le jeton d’accès. Le vérifier dans les réglages.')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Ouvrir les réglages' }));
    expect(screen).toHavePathname('/settings');
  });

  it('says the Garmin access has expired, so a new Personal API Key is needed', async () => {
    bffFails('garmin_access_expired');
    await renderImport();
    expect(await screen.findByText('L’accès Garmin a expiré : créer une nouvelle clé d’API personnelle dans Garmin Connect et la donner au BFF.')).toBeOnTheScreen();
  });

  it('says so on any other failure, the phone’s own included', async () => {
    bffFails('unexpected');
    await renderImport();
    expect(await screen.findByText('L’import a échoué. Réessayer plus tard.')).toBeOnTheScreen();

    bffServes({ activities: [thursdayRun], nextCursor: '2026-11-19T17:00:00.000Z' });
    jest.mocked(saveImport).mockImplementationOnce(() => {
      throw new Error('database is locked');
    });
    await pullToRefresh();
    expect(await screen.findByText('L’import a échoué. Réessayer plus tard.')).toBeOnTheScreen();
  });

  it('clears the failure once an import succeeds', async () => {
    bffFails('network');
    bffServes({ activities: [], nextCursor: '2026-11-17T06:30:00.000Z' });
    await renderImport();
    expect(await screen.findByText(/BFF injoignable/)).toBeOnTheScreen();
    await pullToRefresh();
    expect(await screen.findByText('Aucune nouvelle activité.')).toBeOnTheScreen();
    expect(screen.queryByText(/BFF injoignable/)).not.toBeOnTheScreen();
  });
});

describe('an import that is not set up', () => {
  it('fetches nothing and leads to the settings when the token is missing', async () => {
    const user = userEvent.setup();
    await forgetBffToken();
    givenData({});
    await renderImport();
    expect(screen.getByText('Import Garmin non configuré')).toBeOnTheScreen();
    expect(fetchActivitiesSince).not.toHaveBeenCalled();
    await user.press(screen.getByRole('button', { name: 'Ouvrir les réglages' }));
    expect(screen).toHavePathname('/settings');
  });
});
