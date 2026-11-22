import { render, screen, userEvent } from '@testing-library/react-native';
import { failNextWrite } from '@/test/memorySecureStore';
import { forgetBffToken, useGarminImport } from '../../data/bffAccess.store';
import { SettingsScreen } from '../SettingsScreen';
import { Txt } from '@/shared/ui/kit';

// The token lives in the Keychain / Keystore, absent under Jest: an in-memory store stands in for it.
jest.mock('expo-secure-store', () => jest.requireActual('@/test/memorySecureStore'));

// The BFF URL comes from the variant env file Expo loads; tests set the same variable.
const original = process.env.EXPO_PUBLIC_BFF_URL;
beforeEach(() => forgetBffToken());
afterEach(() => {
  if (original === undefined) delete process.env.EXPO_PUBLIC_BFF_URL;
  else process.env.EXPO_PUBLIC_BFF_URL = original;
});

/** What the rest of the app sees: whether the Garmin import shows. */
function ImportShown() {
  const { access, token } = useGarminImport();
  return <Txt>{access ? `Import affiché, jeton « ${token} »` : 'Import caché'}</Txt>;
}

async function renderSettings(bffUrl: string | null = 'http://localhost:3000') {
  if (bffUrl === null) delete process.env.EXPO_PUBLIC_BFF_URL;
  else process.env.EXPO_PUBLIC_BFF_URL = bffUrl;
  await render(
    <>
      <SettingsScreen />
      <ImportShown />
    </>,
  );
  return userEvent.setup();
}

async function saveToken(user: ReturnType<typeof userEvent.setup>, token: string) {
  await user.type(screen.getByLabelText('Jeton d’accès du BFF'), token);
  await user.press(screen.getByRole('button', { name: 'Enregistrer le jeton' }));
}

describe('the BFF access token', () => {
  it('is entered once, then the Garmin import shows', async () => {
    const user = await renderSettings();
    expect(screen.getByText('BFF : http://localhost:3000')).toBeOnTheScreen();
    expect(screen.getByText('Aucun jeton enregistré.')).toBeOnTheScreen();
    expect(screen.getByText('Import caché')).toBeOnTheScreen();

    await saveToken(user, '  a-long-random-secret  ');

    expect(screen.getByText('Jeton enregistré.')).toBeOnTheScreen();
    expect(screen.getByText('Import affiché, jeton « a-long-random-secret »')).toBeOnTheScreen();
    // The secret never stays on screen once saved.
    expect(screen.getByLabelText('Jeton d’accès du BFF')).toHaveDisplayValue('');
  });

  it('cannot be saved empty', async () => {
    const user = await renderSettings();
    await user.type(screen.getByLabelText('Jeton d’accès du BFF'), '   ');
    expect(screen.getByRole('button', { name: 'Enregistrer le jeton' })).toBeDisabled();
  });

  it('can be removed, which hides the Garmin import again', async () => {
    const user = await renderSettings();
    await saveToken(user, 'a-long-random-secret');
    await user.press(screen.getByRole('button', { name: 'Supprimer le jeton' }));
    expect(await screen.findByText('Aucun jeton enregistré.')).toBeOnTheScreen();
    expect(screen.getByText('Import caché')).toBeOnTheScreen();
  });

  it('says so when the phone cannot store it', async () => {
    const user = await renderSettings();
    failNextWrite();
    await saveToken(user, 'a-long-random-secret');
    expect(screen.getByText('Le jeton n’a pas pu être enregistré sur ce téléphone.')).toBeOnTheScreen();
    expect(screen.getByText('Import caché')).toBeOnTheScreen();
  });
});

describe('a build without a BFF', () => {
  it('explains that the Garmin import is unavailable, and keeps it hidden even with a token', async () => {
    const user = await renderSettings(null);
    expect(screen.getByText('Cette version de l’app n’est reliée à aucun BFF : l’import Garmin est indisponible.')).toBeOnTheScreen();
    await saveToken(user, 'a-long-random-secret');
    expect(screen.getByText('Import caché')).toBeOnTheScreen();
  });
});
