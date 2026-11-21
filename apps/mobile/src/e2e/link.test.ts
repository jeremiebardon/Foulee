import { e2eStateFromLink } from './link';

describe('e2e reset link', () => {
  it('is ignored outside e2e builds', () => {
    expect(e2eStateFromLink('foulee://e2e?seed=demo&signedIn=true', false)).toBeNull();
    expect(e2eStateFromLink('foulee://e2e', false)).toBeNull();
  });

  it('resets to an empty, signed-out app by default', () => {
    expect(e2eStateFromLink('foulee://e2e', true)).toEqual({ seed: 'empty', signedIn: false });
  });

  it('can start signed in, with the demo plan loaded', () => {
    expect(e2eStateFromLink('foulee://e2e?seed=demo&signedIn=true', true)).toEqual({ seed: 'demo', signedIn: true });
    expect(e2eStateFromLink('foulee://e2e?signedIn=true', true)).toEqual({ seed: 'empty', signedIn: true });
  });

  it('signs in only on an explicit signedIn=true', () => {
    expect(e2eStateFromLink('foulee://e2e?signedIn', true)).toEqual({ seed: 'empty', signedIn: false });
    expect(e2eStateFromLink('foulee://e2e?signedIn=false', true)).toEqual({ seed: 'empty', signedIn: false });
  });

  it('accepts the link as Expo Router passes it, with or without scheme', () => {
    expect(e2eStateFromLink('foulee:///e2e?seed=demo', true)).toEqual({ seed: 'demo', signedIn: false });
    expect(e2eStateFromLink('/e2e?seed=demo', true)).toEqual({ seed: 'demo', signedIn: false });
  });

  it('leaves every other link to the router', () => {
    expect(e2eStateFromLink(null, true)).toBeNull();
    expect(e2eStateFromLink('foulee://plans/p1', true)).toBeNull();
    expect(e2eStateFromLink('foulee://e2e-other', true)).toBeNull();
    expect(e2eStateFromLink('/', true)).toBeNull();
  });

  it('rejects an unknown seed instead of starting from a guessed state', () => {
    expect(() => e2eStateFromLink('foulee://e2e?seed=full', true)).toThrow('Unknown e2e seed "full": use empty or demo.');
  });
});
