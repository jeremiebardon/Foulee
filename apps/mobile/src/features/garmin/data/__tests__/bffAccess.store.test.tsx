import { render, screen } from '@testing-library/react-native';
import { setItem } from '@/test/memorySecureStore';
import { Txt } from '@/shared/ui/kit';
import { storedToken, useGarminImport } from '../bffAccess.store';

jest.mock('expo-secure-store', () => jest.requireActual('@/test/memorySecureStore'));

const original = process.env.EXPO_PUBLIC_BFF_URL;
afterEach(() => {
  if (original === undefined) delete process.env.EXPO_PUBLIC_BFF_URL;
  else process.env.EXPO_PUBLIC_BFF_URL = original;
});

const Token = () => <Txt>{useGarminImport().token ?? 'aucun'}</Txt>;

describe('the BFF access token at launch', () => {
  it('is the one saved on an earlier launch', async () => {
    process.env.EXPO_PUBLIC_BFF_URL = 'http://localhost:3000';
    setItem('garmin.bffAccessToken', 'saved-last-week');
    await render(<Token />);
    expect(screen.getByText('saved-last-week')).toBeOnTheScreen();
  });

  it('counts as missing when the phone can no longer read it', () => {
    expect(
      storedToken(() => {
        throw new Error('User interaction is not allowed');
      }),
    ).toBeNull();
    expect(storedToken(() => '')).toBeNull();
    expect(storedToken(() => 'secret')).toBe('secret');
  });
});
