#!/usr/bin/env node
/*
 * Prints, as GitHub Actions step outputs, whether a change affects each named workspace package.
 * Run from the repository root, by .github/workflows/pr-checks.yml and deploy-bff.yml:
 *   node packages/release-tools/bin/affected.js --base <git ref> mobile=mobile contracts=@foulee/contracts >> "$GITHUB_OUTPUT"
 * Each argument is `<output key>=<package name>`. With a base, the change is `turbo ls --affected`
 * against it; with an empty base (a new branch, rewritten history), every package counts as
 * affected. Turbo's list goes to stderr, for the log.
 */
const { execFileSync } = require('node:child_process');
const { parseArgs } = require('node:util');
const { affectedOutputs } = require('../src/affected');

const { values, positionals } = parseArgs({ options: { base: { type: 'string', default: '' } }, allowPositionals: true });
const wanted = Object.fromEntries(positionals.map((pair) => pair.split('=')));
if (positionals.length === 0 || Object.entries(wanted).some(([key, name]) => !key || !name)) {
  console.error('Usage: affected.js [--base <git ref>] <output key>=<package name>...');
  process.exit(2);
}

const args = ['turbo', 'ls', ...(values.base ? ['--affected'] : []), '--output=json'];
const turboLs = execFileSync('pnpm', args, {
  encoding: 'utf8',
  env: { ...process.env, ...(values.base ? { TURBO_SCM_BASE: values.base } : {}) },
  stdio: ['ignore', 'pipe', 'ignore'],
  shell: process.platform === 'win32',
});
console.error(turboLs);
console.log(affectedOutputs(turboLs, wanted).join('\n'));
