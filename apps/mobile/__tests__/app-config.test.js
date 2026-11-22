// Proves the release settings in app.config.ts (#19): the store version is the package manifest's
// version, which changesets bumps, and updates are tied to the native fingerprint. Also proves
// that the e2e guard (src/shared/config/e2eGuard.ts) runs on every config evaluation.
// Evaluates the real config through Expo's own loader. Runs as part of `pnpm lint` through
// `node --test`, outside the app's test runner.
const assert = require('node:assert/strict');
const path = require('node:path');
const { test } = require('node:test');
const { getConfig } = require('expo/config');

const projectRoot = path.join(__dirname, '..');
const { exp } = getConfig(projectRoot, { skipSDKVersionRequirement: true, isPublicConfig: true });

test('the store version is the package manifest version', () => {
  assert.equal(exp.version, require('../package.json').version);
});

test('build numbers are left to EAS (remote app version source)', () => {
  assert.equal(exp.ios?.buildNumber, undefined);
  assert.equal(exp.android?.versionCode, undefined);
});

test('updates only reach builds with the same native fingerprint', () => {
  assert.deepEqual(exp.runtimeVersion, { policy: 'fingerprint' });
});

// Evaluates the config in a fresh process with the given variables, as EAS does per build.
const { spawnSync } = require('node:child_process');
const evaluateConfig = (env) =>
  spawnSync(
    process.execPath,
    ['-e', "require('expo/config').getConfig(process.argv[1], { skipSDKVersionRequirement: true })", projectRoot],
    { cwd: projectRoot, encoding: 'utf8', env: { ...process.env, EXPO_PUBLIC_E2E: '', EAS_BUILD_PROFILE: '', ...env } },
  );

test('the e2e flag stops a production build or update, and only passes in the e2e profile', () => {
  const leak = evaluateConfig({ EXPO_PUBLIC_E2E: 'true', EAS_BUILD_PROFILE: 'production', APP_VARIANT: 'production' });
  assert.notEqual(leak.status, 0);
  assert.match(leak.stderr, /EXPO_PUBLIC_E2E=true is only allowed in the e2e build profile, not "production"/);
  assert.equal(evaluateConfig({ EXPO_PUBLIC_E2E: 'true', EAS_BUILD_PROFILE: 'e2e', APP_VARIANT: 'production' }).status, 0);
  assert.equal(evaluateConfig({ EAS_BUILD_PROFILE: 'production', APP_VARIANT: 'production' }).status, 0);
});
