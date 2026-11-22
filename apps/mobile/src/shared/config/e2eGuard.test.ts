import { assertE2EOnlyInE2EProfile } from './e2eGuard';

describe('e2e guard', () => {
  it('lets the e2e profile build an e2e app', () => {
    expect(() => assertE2EOnlyInE2EProfile({ e2e: 'true', buildProfile: 'e2e' })).not.toThrow();
  });

  it('stops a store or development build that would carry the e2e reset link', () => {
    expect(() => assertE2EOnlyInE2EProfile({ e2e: 'true', buildProfile: 'production' })).toThrow(
      'EXPO_PUBLIC_E2E=true is only allowed in the e2e build profile, not "production".',
    );
    expect(() => assertE2EOnlyInE2EProfile({ e2e: 'true', buildProfile: 'development' })).toThrow('not "development"');
  });

  it('lets every profile build without the e2e flag', () => {
    expect(() => assertE2EOnlyInE2EProfile({ e2e: undefined, buildProfile: 'production' })).not.toThrow();
    expect(() => assertE2EOnlyInE2EProfile({ e2e: 'false', buildProfile: 'production' })).not.toThrow();
  });

  it('leaves builds outside a build profile alone: local e2e builds and the fingerprint job', () => {
    expect(() => assertE2EOnlyInE2EProfile({ e2e: 'true', buildProfile: undefined })).not.toThrow();
    expect(() => assertE2EOnlyInE2EProfile({ e2e: 'true', buildProfile: '' })).not.toThrow();
  });
});
