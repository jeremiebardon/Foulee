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

  it('is gone once cleared', () => {
    saveSession({ email: 'coureur@exemple.com', signedInAt: 1 });
    saveSession(null);
    expect(readSession()).toBeNull();
  });
});
