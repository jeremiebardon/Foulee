import { appConfig } from '../appConfig';

// Expo inlines these from the env files and the EAS profile; tests set the same variables.
const original = { variant: process.env.EXPO_PUBLIC_APP_VARIANT, e2e: process.env.EXPO_PUBLIC_E2E, bffUrl: process.env.EXPO_PUBLIC_BFF_URL };
// Assigning `undefined` to process.env would store the string "undefined": unset it instead.
const restore = (name: string, value: string | undefined) => {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
};
afterEach(() => {
  restore('EXPO_PUBLIC_APP_VARIANT', original.variant);
  restore('EXPO_PUBLIC_E2E', original.e2e);
  restore('EXPO_PUBLIC_BFF_URL', original.bffUrl);
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

describe('the BFF URL', () => {
  const bffUrlFrom = (raw: string | undefined) => {
    if (raw === undefined) delete process.env.EXPO_PUBLIC_BFF_URL;
    else process.env.EXPO_PUBLIC_BFF_URL = raw;
    return appConfig().bffUrl;
  };

  it('comes from the variant env file, without a trailing slash', () => {
    expect(bffUrlFrom('http://localhost:3000')).toBe('http://localhost:3000');
    expect(bffUrlFrom('https://foulee-bff.fly.dev/')).toBe('https://foulee-bff.fly.dev');
  });

  it('is missing when the env file leaves it unset or empty, which hides the Garmin import', () => {
    expect(bffUrlFrom(undefined)).toBeNull();
    expect(bffUrlFrom('')).toBeNull();
    expect(bffUrlFrom('   ')).toBeNull();
  });
});
