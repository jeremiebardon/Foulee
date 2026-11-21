import { render, screen, userEvent } from '@testing-library/react-native';
import { AuthProvider } from './AuthProvider';
import { authGateway } from './gateway';
import { LoginScreen } from './LoginScreen';

// The session store is native SQLite, absent under Jest: an in-memory store stands in for it.
jest.mock('expo-sqlite/kv-store', () => {
  const items = new Map<string, string>();
  return {
    __esModule: true,
    default: {
      getItemSync: (key: string) => items.get(key) ?? null,
      setItemSync: (key: string, value: string) => void items.set(key, value),
      removeItemSync: (key: string) => void items.delete(key),
    },
  };
});

// The variant comes from the env file Expo loads; tests set the same variable.
const original = process.env.EXPO_PUBLIC_APP_VARIANT;
afterEach(() => {
  process.env.EXPO_PUBLIC_APP_VARIANT = original;
});

/** The gateway the composition root would pick for this variant, behind the real login screen. */
async function requestCodeIn(variant: 'development' | 'production') {
  process.env.EXPO_PUBLIC_APP_VARIANT = variant;
  const user = userEvent.setup();
  await render(
    <AuthProvider gateway={authGateway()}>
      <LoginScreen />
    </AuthProvider>,
  );
  await user.type(screen.getByLabelText('Adresse email'), 'coureur@exemple.com');
  await user.press(screen.getByRole('button', { name: 'Recevoir mon code' }));
}

describe('sign-in per variant', () => {
  it('offers the mock sign-in in development, with the code shown on screen', async () => {
    await requestCodeIn('development');
    expect(screen.getByText('Mode démo : aucun email n’est envoyé')).toBeOnTheScreen();
    expect(screen.getByLabelText('Code à 6 chiffres')).toBeOnTheScreen();
  });

  it('has no mock sign-in in production', async () => {
    await requestCodeIn('production');
    expect(screen.getByText('Connexion impossible. Réessayer dans un instant.')).toBeOnTheScreen();
    expect(screen.queryByText('Mode démo : aucun email n’est envoyé')).not.toBeOnTheScreen();
  });
});
