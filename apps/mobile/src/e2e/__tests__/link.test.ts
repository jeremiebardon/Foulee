import { e2eStateFromLink, redirectIncomingLink } from '../link';

describe('e2e reset link', () => {
  it('is ignored outside e2e builds', () => {
    expect(e2eStateFromLink('foulee://e2e?seed=demo&signedIn=true', false)).toBeNull();
    expect(e2eStateFromLink('foulee://e2e', false)).toBeNull();
  });

  it('resets to an empty, signed-out app by default', () => {
    expect(e2eStateFromLink('foulee://e2e', true)).toEqual({ seed: 'empty', signedIn: false, bff: 'none' });
  });

  it('can start signed in, with the demo plan loaded', () => {
    expect(e2eStateFromLink('foulee://e2e?seed=demo&signedIn=true', true)).toEqual({ seed: 'demo', signedIn: true, bff: 'none' });
    expect(e2eStateFromLink('foulee://e2e?signedIn=true', true)).toEqual({ seed: 'empty', signedIn: true, bff: 'none' });
  });

  it('signs in only on an explicit signedIn=true', () => {
    expect(e2eStateFromLink('foulee://e2e?signedIn', true)).toEqual({ seed: 'empty', signedIn: false, bff: 'none' });
    expect(e2eStateFromLink('foulee://e2e?signedIn=false', true)).toEqual({ seed: 'empty', signedIn: false, bff: 'none' });
  });

  it('accepts the link as Expo Router passes it, with or without scheme', () => {
    expect(e2eStateFromLink('foulee:///e2e?seed=demo', true)).toEqual({ seed: 'demo', signedIn: false, bff: 'none' });
    expect(e2eStateFromLink('/e2e?seed=demo', true)).toEqual({ seed: 'demo', signedIn: false, bff: 'none' });
  });

  it('leaves every other link to the router', () => {
    expect(e2eStateFromLink(null, true)).toBeNull();
    expect(e2eStateFromLink('foulee://plans/p1', true)).toBeNull();
    expect(e2eStateFromLink('foulee://e2e-other', true)).toBeNull();
    expect(e2eStateFromLink('/', true)).toBeNull();
  });

  it('can answer the Garmin import with the in-app BFF stub', () => {
    expect(e2eStateFromLink('foulee://e2e?seed=demo&signedIn=true&bff=stub', true)).toEqual({ seed: 'demo', signedIn: true, bff: 'stub' });
  });

  it('rejects an unknown seed or BFF instead of starting from a guessed state', () => {
    expect(() => e2eStateFromLink('foulee://e2e?seed=full', true)).toThrow('Unknown e2e seed "full": use empty or demo.');
    expect(() => e2eStateFromLink('foulee://e2e?bff=fly', true)).toThrow('Unknown e2e BFF "fly": use none or stub.');
  });
});

describe('incoming link redirect', () => {
  it('opens the home screen for the e2e reset link in e2e builds', () => {
    expect(redirectIncomingLink('foulee://e2e?seed=demo&signedIn=true', true)).toBe('/');
  });

  it('leaves every other link, and the reset link outside e2e builds, unchanged', () => {
    expect(redirectIncomingLink('foulee://plans/p1', true)).toBe('foulee://plans/p1');
    expect(redirectIncomingLink('foulee://e2e?seed=demo', false)).toBe('foulee://e2e?seed=demo');
  });

  it('opens the home screen for an unknown seed, which startup rejects loudly', () => {
    expect(redirectIncomingLink('foulee://e2e?seed=full', true)).toBe('/');
  });
});
