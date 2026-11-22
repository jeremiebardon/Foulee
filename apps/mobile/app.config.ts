// App config only loads other TypeScript files through tsx's require hook (Expo SDK 58 TypeScript guide).
import 'tsx/cjs';
import type { ConfigContext, ExpoConfig } from 'expo/config';
import { version } from './package.json';
import { assertE2EOnlyInE2EProfile } from './src/shared/config/e2eGuard';
import { resolveVariant } from './src/shared/config/variant';

/*
 * Thin wrapper around the variant module. APP_VARIANT picks the variant (EAS profiles set it);
 * when it is unset, the variant of the env file Expo loaded for this mode (.env.development for
 * `expo start` and debug builds, .env.production for exports and release builds) is used.
 * The bundle's variant then follows the same choice: Expo CLI evaluates this file before it
 * starts Metro, and inlines EXPO_PUBLIC_* from process.env, so `APP_VARIANT=production expo start`
 * serves a production-variant bundle even though it loaded .env.development.
 * See src/shared/config/appConfig.ts.
 */
const variant = resolveVariant(process.env.APP_VARIANT || process.env.EXPO_PUBLIC_APP_VARIANT);
process.env.EXPO_PUBLIC_APP_VARIANT = variant.variant;

// The e2e reset link must never ship: EXPO_PUBLIC_E2E only in the e2e build profile (EAS sets
// EAS_BUILD_PROFILE on its build workers). See src/shared/config/e2eGuard.ts.
assertE2EOnlyInE2EProfile({ e2e: process.env.EXPO_PUBLIC_E2E, buildProfile: process.env.EAS_BUILD_PROFILE });

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: variant.name,
  slug: 'foulee',
  // The package manifest is the single version source (bumped by changesets). Build numbers are
  // not set here: EAS keeps them remotely (eas.json `appVersionSource: remote`, `autoIncrement`).
  version,
  // An over-the-air update only reaches builds with the same native fingerprint (EAS Update).
  runtimeVersion: { policy: 'fingerprint' },
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  scheme: variant.scheme,
  ios: {
    supportsTablet: true,
    bundleIdentifier: variant.bundleIdentifier,
  },
  android: {
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
    package: variant.androidPackage,
  },
  plugins: [
    'expo-router',
    'expo-sqlite',
    'expo-font',
    // Daily development runs on a development build. Only the development variant registers the
    // dev launcher's `exp+foulee` scheme, so the two variants never claim the same deep links.
    ['expo-dev-client', { addGeneratedScheme: variant.variant === 'development' }],
  ],
  experiments: {
    typedRoutes: true,
  },
});
