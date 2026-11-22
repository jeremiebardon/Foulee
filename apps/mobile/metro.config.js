const { withRozenite } = require('@rozenite/metro');
const { withRozeniteExpoAtlasPlugin } = require('@rozenite/expo-atlas-plugin');
const { withRozeniteRequireProfiler } = require('@rozenite/require-profiler-plugin/metro');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.sourceExts.push('sql'); // Drizzle migrations

/*
 * Rozenite dev tools, in development only. Expo CLI sets NODE_ENV from the mode before it
 * loads this file: development for `expo start` and debug builds, production for exports,
 * release builds and EAS Update. Rozenite asks to be disabled when bundling for release.
 * The plugins' app-side hooks (src/app/_layout.tsx) become no-ops in production bundles.
 */
module.exports = withRozenite(config, {
  enabled: process.env.NODE_ENV === 'development',
  enhanceMetroConfig: (rozeniteConfig) => withRozeniteRequireProfiler(withRozeniteExpoAtlasPlugin(rozeniteConfig)),
});
