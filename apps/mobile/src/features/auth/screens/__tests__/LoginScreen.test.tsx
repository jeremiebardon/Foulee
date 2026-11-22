import { render, screen, userEvent } from '@testing-library/react-native';
import { Txt } from '@/shared/ui/kit';
import { resetFakeServices } from '@/test/fakeServices';
import type { AuthGateway } from '../../domain/auth';
import { AuthProvider, useAuth } from '../../components/AuthProvider';
import { authGateway } from '../../data/gateway';
import { LoginScreen } from '../LoginScreen';

// The session is kept in the key-value store service: an in-memory one stands in for native SQLite.
jest.mock('@/shared/services', () => jest.requireActual('@/test/fakeServices').fakeServicesModule());

// The variant comes from the env file Expo loads; tests set the same variable.
const original = process.env.EXPO_PUBLIC_APP_VARIANT;
beforeEach(resetFakeServices);
afterEach(() => {
  process.env.EXPO_PUBLIC_APP_VARIANT = original;
  jest.restoreAllMocks();
});

/** What the rest of the app sees: who is signed in. */
const SignedInAs = () => <Txt>{useAuth().session?.email ?? 'Personne'}</Txt>;

/** The login screen behind a gateway: the variant's own unless a test injects one. */
async function renderLogin({ variant = 'development', gateway }: { variant?: 'development' | 'production'; gateway?: AuthGateway } = {}) {
  process.env.EXPO_PUBLIC_APP_VARIANT = variant;
  await render(
    <AuthProvider gateway={gateway ?? authGateway()}>
      <LoginScreen />
      <SignedInAs />
    </AuthProvider>,
  );
}

async function requestCode(email = 'coureur@exemple.com') {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Adresse email'), email);
  await user.press(screen.getByRole('button', { name: 'Recevoir mon code' }));
  return user;
}

/** The mock gateway draws its code from Math.random: pin it to know the code shown. */
const nextCodeIs = (code: string) => jest.spyOn(Math, 'random').mockReturnValue((Number(code) + 0.5) / 1_000_000);

describe('sign-in per variant', () => {
  it('offers the mock sign-in in development, with the code shown on screen', async () => {
    await renderLogin({ variant: 'development' });
    await requestCode();
    expect(screen.getByText('Mode démo : aucun email n’est envoyé')).toBeOnTheScreen();
    expect(screen.getByLabelText('Code à 6 chiffres')).toBeOnTheScreen();
  });

  it('has no mock sign-in in production', async () => {
    await renderLogin({ variant: 'production' });
    await requestCode();
    expect(screen.getByText('Connexion impossible. Réessayer dans un instant.')).toBeOnTheScreen();
    expect(screen.queryByText('Mode démo : aucun email n’est envoyé')).not.toBeOnTheScreen();
  });
});

describe('login with the mock gateway', () => {
  it('asks for a code only once the address looks like an email', async () => {
    const user = userEvent.setup();
    await renderLogin();
    expect(screen.getByRole('button', { name: 'Recevoir mon code' })).toBeDisabled();
    await user.type(screen.getByLabelText('Adresse email'), 'coureur@exemple');
    expect(screen.getByRole('button', { name: 'Recevoir mon code' })).toBeDisabled();
    await user.type(screen.getByLabelText('Adresse email'), '.com');
    expect(screen.getByRole('button', { name: 'Recevoir mon code' })).toBeEnabled();
  });

  it('explains a malformed address submitted from the keyboard', async () => {
    const user = userEvent.setup();
    await renderLogin();
    await user.type(screen.getByLabelText('Adresse email'), 'coureur', { submitEditing: true });
    expect(screen.getByText('Cette adresse ne ressemble pas à un email.')).toBeOnTheScreen();
  });

  it('signs in with the code shown on screen', async () => {
    nextCodeIs('042517');
    await renderLogin();
    const user = await requestCode('  Coureur@Exemple.com ');
    expect(screen.getByText('Code envoyé à Coureur@Exemple.com, valable 5 minutes.')).toBeOnTheScreen();
    expect(screen.getByText('Code : 042517')).toBeOnTheScreen();
    expect(screen.getByText('Personne')).toBeOnTheScreen();

    await user.type(screen.getByLabelText('Code à 6 chiffres'), '042517');
    expect(screen.getByText('coureur@exemple.com')).toBeOnTheScreen();
  });

  it('keeps only digits in the code', async () => {
    nextCodeIs('123456');
    await renderLogin();
    const user = await requestCode();
    await user.type(screen.getByLabelText('Code à 6 chiffres'), '12-ab 34');
    expect(screen.getByLabelText('Code à 6 chiffres')).toHaveDisplayValue('1234');
    expect(screen.getByText('Personne')).toBeOnTheScreen();
  });

  it('rejects a wrong code', async () => {
    nextCodeIs('123456');
    await renderLogin();
    const user = await requestCode();
    await user.type(screen.getByLabelText('Code à 6 chiffres'), '654321');
    expect(screen.getByText('Code incorrect. Vérifier les 6 chiffres.')).toBeOnTheScreen();
    expect(screen.getByText('Personne')).toBeOnTheScreen();
  });

  it('sends a new code on request', async () => {
    nextCodeIs('111111');
    await renderLogin();
    const user = await requestCode();
    nextCodeIs('222222');
    await user.press(screen.getByRole('button', { name: 'Renvoyer un code' }));
    expect(screen.getByText('Code : 222222')).toBeOnTheScreen();
  });

  it('goes back to the address to change it', async () => {
    await renderLogin();
    const user = await requestCode();
    await user.press(screen.getByRole('button', { name: 'Changer d’adresse' }));
    expect(screen.getByLabelText('Adresse email')).toHaveDisplayValue('coureur@exemple.com');
    expect(screen.queryByLabelText('Code à 6 chiffres')).not.toBeOnTheScreen();
  });
});

describe('login with another provider', () => {
  it('shows no demo code when the code is sent by email', async () => {
    const emailing: AuthGateway = {
      requestCode: async () => ({ expiresAt: 0 }),
      verifyCode: async (email) => ({ email, signedInAt: 0 }),
    };
    await renderLogin({ gateway: emailing });
    await requestCode();
    expect(screen.getByText('Code envoyé à coureur@exemple.com, valable 5 minutes.')).toBeOnTheScreen();
    expect(screen.queryByText('Mode démo : aucun email n’est envoyé')).not.toBeOnTheScreen();
  });

  it('shows the request in progress', async () => {
    const slow: AuthGateway = { requestCode: () => new Promise(() => {}), verifyCode: () => new Promise(() => {}) };
    await renderLogin({ gateway: slow });
    await requestCode();
    expect(screen.getByRole('button', { name: 'Envoi…' })).toBeDisabled();
  });
});
