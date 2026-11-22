// Proves the release settings in app.config.ts (#19): the store version is the package manifest's
// version, which changesets bumps, and updates are tied to the native fingerprint.
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
