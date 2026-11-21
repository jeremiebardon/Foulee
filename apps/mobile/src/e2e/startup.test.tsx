import { render, screen } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { resetDatabase } from '@/db/reset';
import { AuthProvider, saveSession, useAuth, type AuthGateway } from '@/features/auth';
import { Txt } from '@/shared/ui/kit';
import { applyLaunchLink } from './startup';

// The database layer needs native SQLite, absent under Jest: the reset is recorded instead,
// and the session store is kept in memory.
jest.mock('@/db/client', () => ({ databaseReady: Promise.resolve() }));
jest.mock('@/db/reset', () => ({ resetDatabase: jest.fn() }));
jest.mock('expo-sqlite/kv-store', () => jest.requireActual('@/test/memoryKvStore'));

const gateway: AuthGateway = { requestCode: jest.fn(), verifyCode: jest.fn() };

function Who() {
  const { session } = useAuth();
  return <Txt>{session ? `Connecté : ${session.email}` : 'Déconnecté'}</Txt>;
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

beforeEach(() => saveSession({ email: 'coureur@exemple.com', signedInAt: 1 }));

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
});
