const assert = require('node:assert/strict');
const { test } = require('node:test');
const { checkChangesets, isVersionBranch } = require('./changeset-check');

test('an app change without a changeset fails', () => {
  const result = checkChangesets({ changedFiles: ['apps/mobile/src/features/plans/plan.ts'] });
  assert.equal(result.ok, false);
  assert.match(result.message, /apps\/mobile\/src\/features\/plans\/plan\.ts/);
  assert.match(result.message, /pnpm changeset/);
});

test('an app change with a changeset passes', () => {
  const result = checkChangesets({
    changedFiles: ['apps/mobile/src/features/plans/plan.ts', '.changeset/brave-plans-run.md'],
  });
  assert.equal(result.ok, true);
});

test('a BFF-only change needs no changeset', () => {
  const result = checkChangesets({
    changedFiles: ['apps/bff/src/main.ts', 'apps/bff/package.json', 'docs/adr/0005-bff-is-an-import-source.md'],
  });
  assert.equal(result.ok, true);
  assert.match(result.message, /No changeset needed/);
});

test('a contracts change without a changeset fails, since the app bundles the contracts', () => {
  const result = checkChangesets({ changedFiles: ['packages/contracts/src/activity.ts', 'apps/bff/src/main.ts'] });
  assert.equal(result.ok, false);
  assert.match(result.message, /packages\/contracts\/src\/activity\.ts/);
  assert.doesNotMatch(result.message, /apps\/bff/);
});

test('editing the changeset README is not a changeset', () => {
  const result = checkChangesets({ changedFiles: ['apps/mobile/app.config.ts', '.changeset/README.md'] });
  assert.equal(result.ok, false);
});

test('the Version Packages pull request needs none: it consumes the changesets', () => {
  const result = checkChangesets({
    changedFiles: ['apps/mobile/package.json', 'apps/mobile/CHANGELOG.md'],
    headBranch: 'changeset-release/main',
  });
  assert.equal(result.ok, true);
  assert.match(result.message, /Version Packages/);
});

test('a path that only starts like the app folder is not the app', () => {
  const result = checkChangesets({ changedFiles: ['apps/mobile-web/index.ts', 'packages/contracts-v2/x.ts'] });
  assert.equal(result.ok, true);
});

test('only the Version Packages branch skips changeset validation', () => {
  assert.equal(isVersionBranch('changeset-release/main'), true);
  assert.equal(isVersionBranch('feat/09-tooling-testing-ci-cd'), false);
  assert.equal(isVersionBranch(''), false);
});
