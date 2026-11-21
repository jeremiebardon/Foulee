import { appConfig } from './appConfig';

// Expo inlines these from the env files and the EAS profile; tests set the same variables.
const original = { variant: process.env.EXPO_PUBLIC_APP_VARIANT, e2e: process.env.EXPO_PUBLIC_E2E };
afterEach(() => {
  process.env.EXPO_PUBLIC_APP_VARIANT = original.variant;
  process.env.EXPO_PUBLIC_E2E = original.e2e;
});

const configFor = (variant: 'development' | 'production', e2e?: string) => {
  process.env.EXPO_PUBLIC_APP_VARIANT = variant;
  if (e2e === undefined) delete process.env.EXPO_PUBLIC_E2E;
  else process.env.EXPO_PUBLIC_E2E = e2e;
  return appConfig();
};

describe('e2e builds', () => {
  it('are production builds with the e2e flag: production identity, e2e entry point and dev shortcuts on', () => {
    expect(configFor('production', 'true')).toMatchObject({
      variant: 'production',
      bundleIdentifier: 'com.jbardon.foulee',
      databaseName: 'foulee.db',
      e2e: true,
      // The flows sign in with the mock and load the demo plan.
      devFeatures: true,
    });
  });

  it('keeps store builds, which have no e2e flag, free of the e2e entry point and dev shortcuts', () => {
    expect(configFor('production')).toMatchObject({ e2e: false, devFeatures: false });
    expect(configFor('production', 'false')).toMatchObject({ e2e: false, devFeatures: false });
    expect(configFor('production', '1')).toMatchObject({ e2e: false, devFeatures: false });
  });

  it('never turns development builds into e2e builds, even with the flag', () => {
    expect(configFor('development', 'true')).toMatchObject({ variant: 'development', e2e: false, devFeatures: true });
    expect(configFor('development')).toMatchObject({ e2e: false });
  });
});
