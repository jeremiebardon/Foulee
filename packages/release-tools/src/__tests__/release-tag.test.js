const assert = require('node:assert/strict');
const { test } = require('node:test');
const { planReleaseTag } = require('../release-tag');

// What `changeset version` writes to apps/mobile/CHANGELOG.md.
const CHANGELOG = `# mobile

## 1.2.0

### Minor Changes

- 1a2b3c4: Log a run from the calendar.

### Patch Changes

- 5d6e7f8: Fix the dashboard totals.

## 1.1.0

### Minor Changes

- 9a8b7c6: Training plans.
`;

test('a version with a changelog entry and no tag yet gets its vX.Y.Z tag, with that entry as notes', () => {
  assert.deepEqual(planReleaseTag({ version: '1.2.0', changelog: CHANGELOG, existingTags: ['v1.1.0'] }), {
    action: 'create',
    tag: 'v1.2.0',
    notes: [
      '### Minor Changes',
      '',
      '- 1a2b3c4: Log a run from the calendar.',
      '',
      '### Patch Changes',
      '',
      '- 5d6e7f8: Fix the dashboard totals.',
    ].join('\n'),
  });
});

test('an already tagged version is left alone, so every later push to main is a no-op', () => {
  assert.deepEqual(planReleaseTag({ version: '1.2.0', changelog: CHANGELOG, existingTags: ['v1.1.0', 'v1.2.0'] }), {
    action: 'exists',
    tag: 'v1.2.0',
  });
});

test('a version changesets never released (no changelog entry) gets no tag', () => {
  assert.deepEqual(planReleaseTag({ version: '1.0.0', changelog: CHANGELOG, existingTags: [] }), {
    action: 'unreleased',
    tag: 'v1.0.0',
  });
  assert.deepEqual(planReleaseTag({ version: '1.0.0', changelog: null, existingTags: [] }), {
    action: 'unreleased',
    tag: 'v1.0.0',
  });
});
