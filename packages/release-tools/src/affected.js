/*
 * Which workspace packages a change affects, as GitHub Actions step outputs. Shared by the `check`
 * job (.github/workflows/pr-checks.yml) and the BFF deploy (.github/workflows/deploy-bff.yml).
 * Pure: the CLI in bin/affected.js feeds it the output of `turbo ls --output=json`.
 */

/**
 * One `key=true|false` line per wanted output, `true` when turbo lists its package. `wanted` maps
 * an output key to a package name, e.g. `{ contracts: '@foulee/contracts' }`. pnpm and turbo may
 * print lines before the JSON (a version banner, a warning), so the list is read from its first `{`.
 */
function affectedOutputs(turboLs, wanted) {
  const start = turboLs.indexOf('{');
  if (start === -1) throw new Error(`turbo printed no package list:\n${turboLs}`);
  const names = new Set(JSON.parse(turboLs.slice(start)).packages.items.map((item) => item.name));
  return Object.entries(wanted).map(([key, name]) => `${key}=${names.has(name)}`);
}

module.exports = { affectedOutputs };
