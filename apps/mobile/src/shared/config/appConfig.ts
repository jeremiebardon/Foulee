import { resolveVariant, type VariantConfig } from './variant';

/**
 * The one place the app reads its environment: features ask this accessor, never process.env.
 * The variant comes from the committed .env.development / .env.production that Expo CLI loads
 * for the mode, and is inlined at build time. Keep the static dot access: Expo inlines nothing else.
 * Read on each call, not cached, so tests can switch variants by setting the variable.
 */
export const appConfig = (): VariantConfig => resolveVariant(process.env.EXPO_PUBLIC_APP_VARIANT);
