import { render, screen, userEvent } from '@testing-library/react-native';
import { Button, Txt } from '@/shared/ui/kit';
import { resetFakeServices } from '@/test/fakeServices';
import { saveSession } from '../../data/session.store';
import type { AuthGateway } from '../../domain/auth';
import { AuthProvider, LoginScreen, useAuth } from '../..';

// The session is kept in the key-value store service: an in-memory one stands in for native SQLite.
jest.mock('@/shared/services', () => jest.requireActual('@/test/fakeServices').fakeServicesModule());

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

beforeEach(resetFakeServices);

describe('auth provider', () => {
  it('starts signed out on a first launch', async () => {
    await launch();
    expect(screen.getByRole('button', { name: 'Se connecter' })).toBeOnTheScreen();
  });

  it('starts signed in when a session was saved before, with no login screen first', async () => {
    saveSession({ email: 'coureur@exemple.com', signedInAt: 1 });
    await launch();
    expect(screen.getByText('Connecté : coureur@exemple.com')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Se connecter' })).not.toBeOnTheScreen();
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
    saveSession({ email: 'coureur@exemple.com', signedInAt: 1 });
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
