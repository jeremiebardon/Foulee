import { services } from '@/shared/services';
import { resetFakeServices } from '@/test/fakeServices';
import { readSession, saveSession } from '../session.store';

jest.mock('@/shared/services', () => jest.requireActual('@/test/fakeServices').fakeServicesModule());

beforeEach(resetFakeServices);

describe('the stored session', () => {
  it('is none before anyone signed in', () => {
    expect(readSession()).toBeNull();
  });

  it('is the one last saved', () => {
    const session = { email: 'coureur@exemple.com', signedInAt: 1 };
    saveSession(session);
    expect(readSession()).toEqual(session);
  });

  // The key is what existing installs have stored: changing it would sign everyone out.
  it('is kept as JSON under the key earlier launches used', () => {
    const session = { email: 'coureur@exemple.com', signedInAt: 1 };
    saveSession(session);
    expect(services.kvStore.get('auth.session')).toBe(JSON.stringify(session));
    services.kvStore.set('auth.session', JSON.stringify({ email: 'autre@exemple.com', signedInAt: 2 }));
    expect(readSession()).toEqual({ email: 'autre@exemple.com', signedInAt: 2 });
  });

  it('is gone once cleared', () => {
    saveSession({ email: 'coureur@exemple.com', signedInAt: 1 });
    saveSession(null);
    expect(readSession()).toBeNull();
    expect(services.kvStore.get('auth.session')).toBeNull();
  });
});
