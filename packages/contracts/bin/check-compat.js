#!/usr/bin/env node
// Fails when the v1 contract on this checkout would break an app build already installed against
// the contract at --base (the copy of json-schema/v1.json committed there). Needs dist/ built.
//
//   node packages/contracts/bin/check-compat.js --base origin/main
//
// The rule it enforces (additive-only inside /v1) is described in packages/contracts/README.md.
const { execFileSync } = require('node:child_process');
const { join } = require('node:path');
const { findBreakingChanges, toJsonSchemaSnapshot, v1Contract } = require('../dist/compat.js');

const SNAPSHOT = 'packages/contracts/json-schema/v1.json';
const repoRoot = join(__dirname, '..', '..', '..');

const baseFlag = process.argv.indexOf('--base');
const base = baseFlag === -1 ? undefined : process.argv[baseFlag + 1];
if (!base) {
  console.error('Usage: check-compat.js --base <git ref>');
  process.exit(2);
}

function git(...args) {
  return execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

// A ref that does not resolve is a CI misconfiguration, not a pass.
git('rev-parse', '--verify', '--quiet', `${base}^{commit}`);

try {
  git('cat-file', '-e', `${base}:${SNAPSHOT}`);
} catch {
  console.log(`${SNAPSHOT} does not exist on ${base} yet: nothing to compare against, the check passes.`);
  process.exit(0);
}

const baseSnapshot = JSON.parse(git('show', `${base}:${SNAPSHOT}`));
const changes = findBreakingChanges(baseSnapshot, toJsonSchemaSnapshot(v1Contract));
if (changes.length === 0) {
  console.log(`The v1 contract is backward compatible with ${base}.`);
  process.exit(0);
}

console.error(`The v1 contract has ${changes.length} breaking change(s) compared with ${base}:`);
for (const { path, message } of changes) {
  console.error(`::error title=Breaking v1 contract change::${path}: ${message}`);
}
console.error(
  'Changes inside /v1 must be additive only (packages/contracts/README.md): add an optional field or a new endpoint instead.',
);
process.exit(1);
