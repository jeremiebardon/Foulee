# Changesets

A changeset is a Markdown file in this folder that says which release a change needs and what goes in the changelog. Changesets versions one package, the app (`mobile`, in `apps/mobile`); the BFF and the `@foulee/*` packages are ignored (see `config.json`).

- Add one with `pnpm changeset` at the repository root, pick `mobile` and the bump (patch, minor or major), and commit the file it writes.
- A pull request that changes `apps/mobile` or `packages/contracts` fails the `check` job without one. If the change ships nothing users notice (tests, tooling), add an empty one with `pnpm changeset --empty`.

The release flow is in `docs/release-guide.md`. Changesets docs: <https://changesets.dev>.
