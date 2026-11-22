#!/usr/bin/env node
/*
 * Tags the app release `v<version>` and creates its GitHub release, once the Version Packages pull
 * request has bumped apps/mobile/package.json and written apps/mobile/CHANGELOG.md. Pushing the tag
 * starts the EAS release workflow (apps/mobile/.eas/workflows/release.yml).
 * Run from the repository root by .github/workflows/release.yml on every push to main; it does
 * nothing when the version is already tagged or was never released by changesets.
 *   node packages/release-tools/bin/tag-release.js [--dry-run]
 * Needs full history and tags (actions/checkout with fetch-depth: 0), a git identity, and GH_TOKEN
 * for the `gh` CLI.
 */
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { parseArgs } = require('node:util');
const { planReleaseTag } = require('../src/release-tag');

const { values } = parseArgs({ options: { 'dry-run': { type: 'boolean', default: false } } });
const dryRun = values['dry-run'];

const APP = 'apps/mobile';
const run = (cmd, args, input) => execFileSync(cmd, args, { encoding: 'utf8', input }).trim();
const readIfExists = (file) => (fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null);

const { version } = JSON.parse(fs.readFileSync(path.join(APP, 'package.json'), 'utf8'));
const changelog = readIfExists(path.join(APP, 'CHANGELOG.md'));
const existingTags = run('git', ['tag', '--list', 'v*']).split('\n').filter(Boolean);

const plan = planReleaseTag({ version, changelog, existingTags });

if (plan.action === 'exists') {
  console.log(`${plan.tag} already exists: nothing to release.`);
  process.exit(0);
}
if (plan.action === 'unreleased') {
  console.log(`${APP}/CHANGELOG.md has no entry for ${version}: changesets has not released it yet.`);
  process.exit(0);
}

// The commit that set the current version: the Version Packages merge. Tagging it rather than HEAD
// keeps the release exact even when this run picks up later pushes too.
const commit = run('git', ['log', '-1', '--format=%H', '-G"version":', '--', `${APP}/package.json`]);

if (dryRun) {
  console.log(`Would tag ${commit} as ${plan.tag} and create its GitHub release with these notes:\n\n${plan.notes}`);
  process.exit(0);
}

run('git', ['tag', '--annotate', plan.tag, '--message', `Foulée ${version}`, commit]);
run('git', ['push', 'origin', `refs/tags/${plan.tag}`]);
run('gh', ['release', 'create', plan.tag, '--verify-tag', '--title', plan.tag, '--notes-file', '-'], plan.notes);
console.log(`Released ${plan.tag} (${commit}).`);
