/*
 * The changeset-required check (docs/release-guide.md). A pull request that changes what ships in
 * the app, `apps/mobile` or the API contracts it bundles, must add a changeset, so every user-facing
 * change reaches the changelog. Pure: the CLI in bin/check-changeset.js feeds it `git diff`.
 */

// Paths, relative to the repository root, whose changes need a changeset.
const RELEASED_PATHS = ['apps/mobile/', 'packages/contracts/'];

// A changeset is a Markdown file directly in .changeset/; its README is not one.
const isChangeset = (file) => /^\.changeset\/[^/]+\.md$/.test(file) && file !== '.changeset/README.md';

// changesets/action pushes the Version Packages pull request from `changeset-release/<base>`.
const VERSION_BRANCH_PREFIX = 'changeset-release/';

function checkChangesets({ changedFiles, headBranch = '' }) {
  if (headBranch.startsWith(VERSION_BRANCH_PREFIX)) {
    return { ok: true, message: 'Version Packages pull request: it consumes the changesets, none needed.' };
  }
  const released = changedFiles.filter((file) => RELEASED_PATHS.some((dir) => file.startsWith(dir)));
  const changesets = changedFiles.filter(isChangeset);
  if (changesets.length > 0) {
    return { ok: true, message: `Changesets found: ${changesets.join(', ')}` };
  }
  if (released.length === 0) {
    return { ok: true, message: `No changeset needed: nothing under ${RELEASED_PATHS.join(' or ')} changed.` };
  }
  return {
    ok: false,
    message: [
      'These files ship in the app but the pull request adds no changeset:',
      ...released.map((file) => `  ${file}`),
      'Run `pnpm changeset` at the repository root and commit the file it writes.',
    ].join('\n'),
  };
}

module.exports = { checkChangesets };
