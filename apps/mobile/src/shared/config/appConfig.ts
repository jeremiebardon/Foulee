import { resolveVariant, type VariantConfig } from './variant';

export type AppConfig = VariantConfig & {
  /**
   * End-to-end test build (the `e2e` EAS profile): honours the e2e reset link (src/e2e) and turns
   * the dev shortcuts on, since the Maestro flows sign in with the mock and load the demo plan.
   */
  e2e: boolean;
};

/**
 * The one place the app reads its environment: features ask this accessor, never process.env.
 * The variant comes from the committed .env.development / .env.production that Expo CLI loads
 * for the mode, and is inlined at build time. Keep the static dot access: Expo inlines nothing else.
 * Read on each call, not cached, so tests can switch variants by setting the variable.
 */
export const appConfig = (): AppConfig => {
  const variant = resolveVariant(process.env.EXPO_PUBLIC_APP_VARIANT);
  // Only the e2e profile sets EXPO_PUBLIC_E2E, and only a production-variant build honours it.
  const e2e = variant.variant === 'production' && process.env.EXPO_PUBLIC_E2E === 'true';
  return { ...variant, e2e, devFeatures: variant.devFeatures || e2e };
};
