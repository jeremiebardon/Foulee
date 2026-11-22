import { services } from '@/shared/services';
import { failNextSecureWrite, resetFakeServices } from '@/test/fakeServices';
import { forgetBffToken, readBffToken, saveBffToken, storedToken } from '../bffAccess.store';

// The token lives in the secure store service: the fake stands in for the Keychain / Keystore.
jest.mock('@/shared/services', () => jest.requireActual('@/test/fakeServices').fakeServicesModule());

beforeEach(resetFakeServices);

describe('the BFF access token at launch', () => {
  // The store reads the secure store once per process: this case is the file's first read.
  it('is the one saved on an earlier launch', () => {
    services.secureStore.set('garmin.bffAccessToken', 'saved-last-week');
    expect(readBffToken()).toBe('saved-last-week');
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

describe('saving and forgetting the token', () => {
  it('keeps the saved token in the secure store and tells the screens', () => {
    saveBffToken('a-long-random-secret');
    expect(readBffToken()).toBe('a-long-random-secret');
    expect(services.secureStore.get('garmin.bffAccessToken')).toBe('a-long-random-secret');
  });

  it('forgets it everywhere', async () => {
    saveBffToken('a-long-random-secret');
    await forgetBffToken();
    expect(readBffToken()).toBeNull();
    expect(services.secureStore.get('garmin.bffAccessToken')).toBeNull();
  });

  it('throws when the phone cannot store it, and keeps the token it had', () => {
    saveBffToken('old');
    failNextSecureWrite();
    expect(() => saveBffToken('new')).toThrow();
    expect(readBffToken()).toBe('old');
  });
});
