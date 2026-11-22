/**
 * The app variants and what sets them apart. Pure: app.config.ts uses it for the native
 * identity at build time, and the runtime config accessor (./appConfig) for the rest.
 */
export type Variant = 'development' | 'production';

export type VariantConfig = {
  variant: Variant;
  /** Display name on the home screen. */
  name: string;
  bundleIdentifier: string;
  androidPackage: string;
  /** Deep link URL scheme. */
  scheme: string;
  /** SQLite file name, so each variant keeps its own data. */
  databaseName: string;
  /** Dev shortcuts: the mock sign-in and the "load demo plan" action. */
  devFeatures: boolean;
};

const VARIANTS: Record<Variant, VariantConfig> = {
  production: {
    variant: 'production',
    name: 'Foulée',
    bundleIdentifier: 'com.jbardon.foulee',
    androidPackage: 'com.jbardon.foulee',
    scheme: 'foulee',
    databaseName: 'foulee.db',
    devFeatures: false,
  },
  // Its own identity, so it installs next to the production app and never touches its data.
  development: {
    variant: 'development',
    name: 'Foulée Dev',
    bundleIdentifier: 'com.jbardon.foulee.dev',
    androidPackage: 'com.jbardon.foulee.dev',
    scheme: 'foulee-dev',
    databaseName: 'foulee-dev.db',
    devFeatures: true,
  },
};

const isVariant = (raw: string): raw is Variant => Object.hasOwn(VARIANTS, raw);

/**
 * Unset means production, like an EAS production profile that sets no APP_VARIANT. A typo
 * throws rather than silently building the wrong app.
 */
export function resolveVariant(raw: string | undefined): VariantConfig {
  const name = raw || 'production';
  if (!isVariant(name)) throw new Error(`Unknown APP_VARIANT "${name}": use development or production.`);
  return VARIANTS[name];
}
