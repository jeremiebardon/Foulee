import { render, screen } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { resetDatabase } from '@/db/reset';
import { AuthProvider, saveSession, useAuth, type AuthGateway } from '@/features/auth';
import { fetchActivitiesSince, forgetBffToken, useGarminImport } from '@/features/garmin';
import { Txt } from '@/shared/ui/kit';
import { applyLaunchLink } from '../startup';

// The database layer needs native SQLite, absent under Jest: the reset is recorded instead,
// and the session store is kept in memory.
jest.mock('@/db/client', () => ({ databaseReady: Promise.resolve() }));
jest.mock('@/db/reset', () => ({ resetDatabase: jest.fn() }));
jest.mock('expo-sqlite/kv-store', () => jest.requireActual('@/test/memoryKvStore'));
jest.mock('expo-secure-store', () => jest.requireActual('@/test/memorySecureStore'));

const gateway: AuthGateway = { requestCode: jest.fn(), verifyCode: jest.fn() };

function Who() {
  const { session } = useAuth();
  const { available } = useGarminImport();
  return (
    <>
      <Txt>{session ? `Connecté : ${session.email}` : 'Déconnecté'}</Txt>
      <Txt>{available ? 'Import Garmin prêt' : 'Import Garmin absent'}</Txt>
    </>
  );
}

/** Launches the app with `url` as its launch link, then shows who the auth provider starts with. */
async function launchWith(url: string | null, e2eBuild: boolean) {
  jest.spyOn(Linking, 'getInitialURL').mockResolvedValue(url);
  await applyLaunchLink(e2eBuild);
  await render(
    <AuthProvider gateway={gateway}>
      <Who />
    </AuthProvider>,
  );
}

const realFetch = globalThis.fetch;
const originalBffUrl = process.env.EXPO_PUBLIC_BFF_URL;
beforeEach(async () => {
  saveSession({ email: 'coureur@exemple.com', signedInAt: 1 });
  await forgetBffToken();
  process.env.EXPO_PUBLIC_BFF_URL = 'https://bff.example';
});
afterEach(() => {
  globalThis.fetch = realFetch;
  if (originalBffUrl === undefined) delete process.env.EXPO_PUBLIC_BFF_URL;
  else process.env.EXPO_PUBLIC_BFF_URL = originalBffUrl;
});

describe('e2e launch link at startup', () => {
  it('is never read outside e2e builds: data and session stay as they were', async () => {
    await launchWith('foulee://e2e?seed=demo', false);
    expect(Linking.getInitialURL).not.toHaveBeenCalled();
    expect(resetDatabase).not.toHaveBeenCalled();
    expect(screen.getByText('Connecté : coureur@exemple.com')).toBeOnTheScreen();
  });

  it('resets to the requested seed, signed in, in an e2e build', async () => {
    await launchWith('foulee://e2e?seed=demo&signedIn=true', true);
    expect(resetDatabase).toHaveBeenCalledWith('demo');
    expect(screen.getByText('Connecté : e2e@foulee.test')).toBeOnTheScreen();
  });

  it('resets to an empty, signed-out app by default', async () => {
    await launchWith('foulee://e2e', true);
    expect(resetDatabase).toHaveBeenCalledWith('empty');
    expect(screen.getByText('Déconnecté')).toBeOnTheScreen();
  });

  it('leaves the app alone when an e2e build is launched without the reset link', async () => {
    await launchWith(null, true);
    expect(resetDatabase).not.toHaveBeenCalled();
    expect(screen.getByText('Connecté : coureur@exemple.com')).toBeOnTheScreen();
  });

  it('sets up the Garmin import against the in-app BFF stub when the link asks for it', async () => {
    await launchWith('foulee://e2e?seed=demo&signedIn=true&bff=stub', true);
    expect(screen.getByText('Import Garmin prêt')).toBeOnTheScreen();
    const page = await fetchActivitiesSince({ bffUrl: 'https://bff.example', token: 'any', since: null });
    expect(page.activities.map((a) => a.garminActivityId)).toEqual(['e2e-1']);
  });

  it('leaves the Garmin import alone otherwise', async () => {
    await launchWith('foulee://e2e?seed=demo&signedIn=true', true);
    expect(screen.getByText('Import Garmin absent')).toBeOnTheScreen();
    expect(globalThis.fetch).toBe(realFetch);
  });

  it('stubs nothing in a build without a BFF, where the import stays hidden', async () => {
    delete process.env.EXPO_PUBLIC_BFF_URL;
    await launchWith('foulee://e2e?bff=stub', true);
    expect(screen.getByText('Import Garmin absent')).toBeOnTheScreen();
    expect(globalThis.fetch).toBe(realFetch);
  });
});
