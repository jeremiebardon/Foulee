import { resolveVariant } from './variant';

describe('variant resolution', () => {
  it('gives production the store identity, the real database and no dev features', () => {
    expect(resolveVariant('production')).toEqual({
      variant: 'production',
      name: 'Foulée',
      bundleIdentifier: 'com.jbardon.foulee',
      androidPackage: 'com.jbardon.foulee',
      scheme: 'foulee',
      databaseName: 'foulee.db',
      devFeatures: false,
    });
  });

  it('gives development its own identity, name, scheme and database, with dev features on', () => {
    expect(resolveVariant('development')).toEqual({
      variant: 'development',
      name: 'Foulée Dev',
      bundleIdentifier: 'com.jbardon.foulee.dev',
      androidPackage: 'com.jbardon.foulee.dev',
      scheme: 'foulee-dev',
      databaseName: 'foulee-dev.db',
      devFeatures: true,
    });
  });

  it('falls back to production when no variant is set, so dev features stay off', () => {
    expect(resolveVariant(undefined)).toMatchObject({ variant: 'production', bundleIdentifier: 'com.jbardon.foulee', devFeatures: false });
    expect(resolveVariant('')).toMatchObject({ variant: 'production' });
  });

  it('rejects an unknown variant instead of guessing one', () => {
    expect(() => resolveVariant('staging')).toThrow('Unknown APP_VARIANT "staging": use development or production.');
  });
});
