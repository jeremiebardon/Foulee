/*
 * Decides the release tag for the app (docs/release-guide.md). A version is released once
 * `changeset version` has written its changelog entry, which happens in the Version Packages
 * pull request; its tag is `v<version>`. Pure: the CLI in bin/tag-release.js reads the files and
 * git tags, and pushes the tag.
 */

// The body of `## <version>` in a changesets changelog, without the heading, or null.
function changelogEntry(changelog, version) {
  const lines = changelog.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === `## ${version}`);
  if (start === -1) return null;
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => /^## /.test(line));
  return (end === -1 ? rest : rest.slice(0, end)).join('\n').trim();
}

function planReleaseTag({ version, changelog, existingTags }) {
  const tag = `v${version}`;
  if (existingTags.includes(tag)) return { action: 'exists', tag };
  const notes = changelog == null ? null : changelogEntry(changelog, version);
  if (notes == null) return { action: 'unreleased', tag };
  return { action: 'create', tag, notes };
}

module.exports = { planReleaseTag };
