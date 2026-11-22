import { screen, userEvent } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import { forgetBffToken, saveBffToken } from '../bffAccess.client';
import { GarminImportLink } from '../GarminImportLink';

jest.mock('expo-secure-store', () => jest.requireActual('@/test/memorySecureStore'));

const original = process.env.EXPO_PUBLIC_BFF_URL;
beforeEach(() => forgetBffToken());
afterEach(() => {
  if (original === undefined) delete process.env.EXPO_PUBLIC_BFF_URL;
  else process.env.EXPO_PUBLIC_BFF_URL = original;
});

async function renderLink({ bffUrl, token }: { bffUrl: string | null; token: string | null }) {
  if (bffUrl === null) delete process.env.EXPO_PUBLIC_BFF_URL;
  else process.env.EXPO_PUBLIC_BFF_URL = bffUrl;
  if (token !== null) saveBffToken(token);
  await renderRouter({ index: GarminImportLink, garmin: () => null }, { initialUrl: '/' });
}

const importLink = () => screen.queryByRole('button', { name: 'Importer depuis Garmin' });

describe('the Garmin import entry point', () => {
  it('opens the import once the build has a BFF URL and a token is saved', async () => {
    const user = userEvent.setup();
    await renderLink({ bffUrl: 'http://localhost:3000', token: 'the-token' });
    await user.press(importLink()!);
    expect(screen).toHavePathname('/garmin');
  });

  it('is hidden while no token is saved', async () => {
    await renderLink({ bffUrl: 'http://localhost:3000', token: null });
    expect(importLink()).not.toBeOnTheScreen();
  });

  it('is hidden in a build without a BFF URL', async () => {
    await renderLink({ bffUrl: null, token: 'the-token' });
    expect(importLink()).not.toBeOnTheScreen();
  });
});
