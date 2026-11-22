import { act, renderHook } from '@testing-library/react-native';
import { failNextSecureRead, resetFakeServices } from '@/test/fakeServices';
import { forgetBffToken, saveBffToken } from '../../data/bffAccess.store';
import { useGarminImport } from '../useGarminImport';

jest.mock('@/shared/services', () => jest.requireActual('@/test/fakeServices').fakeServicesModule());

// The BFF URL comes from the variant env file Expo loads; tests set the same variable.
const original = process.env.EXPO_PUBLIC_BFF_URL;
beforeEach(() => {
  resetFakeServices();
  process.env.EXPO_PUBLIC_BFF_URL = 'https://bff.test';
});
afterEach(() => {
  if (original === undefined) delete process.env.EXPO_PUBLIC_BFF_URL;
  else process.env.EXPO_PUBLIC_BFF_URL = original;
});

describe('the Garmin import access', () => {
  // The token is read from the secure store once per process: this case is the file's first read.
  it('has no token and no access when the phone cannot read the saved token', async () => {
    failNextSecureRead();
    const { result } = await renderHook(() => useGarminImport());
    expect(result.current).toEqual({ bffUrl: 'https://bff.test', token: null, access: null });
  });

  it('is the BFF URL and the token once one is saved, one object until either changes', async () => {
    await forgetBffToken();
    const { result, rerender } = await renderHook(() => useGarminImport());
    await act(async () => saveBffToken('tok'));
    expect(result.current).toEqual({ bffUrl: 'https://bff.test', token: 'tok', access: { bffUrl: 'https://bff.test', token: 'tok' } });
    const { access } = result.current;
    await rerender(undefined);
    expect(result.current.access).toBe(access);
  });

  it('has no access in a build without a BFF URL', async () => {
    delete process.env.EXPO_PUBLIC_BFF_URL;
    await act(async () => saveBffToken('tok'));
    const { result } = await renderHook(() => useGarminImport());
    expect(result.current).toEqual({ bffUrl: null, token: 'tok', access: null });
  });
});
