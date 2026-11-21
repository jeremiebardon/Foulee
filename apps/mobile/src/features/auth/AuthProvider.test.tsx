import { render, screen, userEvent } from '@testing-library/react-native';
import Storage from 'expo-sqlite/kv-store';
import { Button, Txt } from '@/shared/ui/kit';
import type { AuthGateway } from './auth';
import { AuthProvider, LoginScreen, useAuth } from '.';

// The session store is native SQLite, absent under Jest: an in-memory store stands in for it.
jest.mock('expo-sqlite/kv-store', () => jest.requireActual('@/test/memoryKvStore'));

const gateway: AuthGateway = { requestCode: jest.fn(), verifyCode: jest.fn() };

/** Stands for the screens behind the login: who is signed in, and the sign-out button. */
function Account() {
  const { session, signIn, signOut } = useAuth();
  return session ? (
    <>
      <Txt>Connecté : {session.email}</Txt>
      <Button title="Se déconnecter" onPress={signOut} />
    </>
  ) : (
    <Button title="Se connecter" onPress={() => signIn({ email: 'coureur@exemple.com', signedInAt: 1 })} />
  );
}

/** One app launch: the provider reads the stored session when it starts. */
const launch = () =>
  render(
    <AuthProvider gateway={gateway}>
      <Account />
    </AuthProvider>,
  );

beforeEach(() => Storage.clearSync());

describe('auth provider', () => {
  it('starts signed out on a first launch', async () => {
    await launch();
    expect(screen.getByRole('button', { name: 'Se connecter' })).toBeOnTheScreen();
  });

  it('keeps the session across launches', async () => {
    const user = userEvent.setup();
    const first = await launch();
    await user.press(screen.getByRole('button', { name: 'Se connecter' }));
    expect(screen.getByText('Connecté : coureur@exemple.com')).toBeOnTheScreen();
    await first.unmount();

    await launch();
    expect(screen.getByText('Connecté : coureur@exemple.com')).toBeOnTheScreen();
  });

  it('forgets the session on sign-out, for the next launch too', async () => {
    const user = userEvent.setup();
    Storage.setItemSync('auth.session', JSON.stringify({ email: 'coureur@exemple.com', signedInAt: 1 }));
    const first = await launch();
    await user.press(screen.getByRole('button', { name: 'Se déconnecter' }));
    expect(screen.getByRole('button', { name: 'Se connecter' })).toBeOnTheScreen();
    await first.unmount();

    await launch();
    expect(screen.getByRole('button', { name: 'Se connecter' })).toBeOnTheScreen();
  });

  it('cannot be used outside the provider', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(render(<LoginScreen />)).rejects.toThrow('useAuth must be used inside <AuthProvider>');
    jest.mocked(console.error).mockRestore();
  });
});
