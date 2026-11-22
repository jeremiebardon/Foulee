import { bffAccessOf } from '../bffAccess';

describe('access to the BFF', () => {
  it('is its URL and the BFF Access Token, once the build has the one and the runner has saved the other', () => {
    expect(bffAccessOf({ bffUrl: 'http://localhost:3000', token: 'secret' })).toEqual({ bffUrl: 'http://localhost:3000', token: 'secret' });
  });

  it('is missing, and the Garmin import with it, while either is', () => {
    expect(bffAccessOf({ bffUrl: null, token: 'secret' })).toBeNull();
    expect(bffAccessOf({ bffUrl: 'http://localhost:3000', token: null })).toBeNull();
    expect(bffAccessOf({ bffUrl: null, token: null })).toBeNull();
  });
});
