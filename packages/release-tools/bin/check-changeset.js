#!/usr/bin/env node
/*
 * Fails when a pull request changes apps/mobile or packages/contracts without adding a changeset.
 * Run from the repository root, by the `check` job in .github/workflows/pr-checks.yml:
 *   node packages/release-tools/bin/check-changeset.js --base origin/main [--head-branch <branch>]
 * The diff is `<base>...HEAD`: what the branch changed since it left the base. Then, except on the
 * Version Packages branch, `changeset status --since=<base>` validates the changesets themselves.
 */
const { execFileSync, spawnSync } = require('node:child_process');
const { parseArgs } = require('node:util');
const { checkChangesets, isVersionBranch } = require('../src/changeset-check');

const { values } = parseArgs({
  options: {
    base: { type: 'string' },
    'head-branch': { type: 'string', default: '' },
  },
});
if (!values.base) {
  console.error('Usage: check-changeset.js --base <git ref> [--head-branch <branch>]');
  process.exit(2);
}

// Deleted files are left out, so a branch that only removes a changeset does not count as adding one.
const changedFiles = execFileSync('git', ['diff', '--name-only', '--diff-filter=d', `${values.base}...HEAD`], {
  encoding: 'utf8',
})
  .split('\n')
  .filter(Boolean);

const headBranch = values['head-branch'];
const result = checkChangesets({ changedFiles, headBranch });
(result.ok ? console.log : console.error)(result.message);
if (!result.ok) process.exit(1);
if (isVersionBranch(headBranch)) process.exit(0);

const status = spawnSync('pnpm', ['changeset', 'status', `--since=${values.base}`], { stdio: 'inherit', shell: process.platform === 'win32' });
process.exit(status.status ?? 1);
