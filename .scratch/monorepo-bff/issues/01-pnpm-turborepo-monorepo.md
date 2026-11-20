# 01: pnpm + Turborepo monorepo with the app in `apps/mobile`

**What to build:** The repository becomes a pnpm + Turborepo monorepo (ADR 0004). The Expo app moves unchanged to `apps/mobile`. Shared TypeScript and ESLint config move into `packages/tsconfig` and `packages/eslint-config`. Turbo defines `build`, `lint`, `typecheck`, `test` and `dev` tasks, and remote cache is configured (the token itself is a manual step). The app still starts on a device, and its existing tests, lint and typecheck pass when run through Turbo from the root. AGENTS.md and the README commands are updated to run from the right workspace.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] The Expo SDK 58 monorepo guide was read before the move, and its Metro and pnpm guidance is followed
- [x] `package-lock.json` is gone, and `pnpm-lock.yaml` and `pnpm-workspace.yaml` exist
- [ ] `apps/mobile` starts with `pnpm --filter mobile start` and the app loads its existing data paths (migrations, seed). Android bundle verified with `expo export` (SQL migrations included); not yet opened on a device or simulator
- [x] `pnpm turbo run lint typecheck test` passes from the root
- [x] `pnpm turbo run test --affected` (against a local base) skips mobile when only a root file outside it changes
- [x] Root-level docs (`GLOSSARY.md`, `docs/adr`, `.scratch`) stay at the root
- [x] AGENTS.md commands work as written in the monorepo (Expo installs run in the mobile workspace)

## Comments

**2026-11-20, implementation notes:**
- Metro config is unchanged: `expo/metro-config` handles monorepos since SDK 52 (Expo monorepo guide). Installs stay isolated (pnpm default, supported since SDK 54); no `nodeLinker: hoisted` needed.
- Isolated installs surfaced a missing peer, `expo-font` (required by `@expo/vector-icons`), now a direct dependency. `expo-doctor` passes 20/20, and `expo export --platform android` bundles.
- `pnpm-workspace.yaml` allows esbuild's install script (`allowBuilds`), which pnpm blocks by default.
- `--affected` was checked in a throwaway git copy, since the repo has no git yet: a root README change affects nothing, a mobile change affects `mobile`, and a `@foulee/tsconfig` change affects both.
- `test` declares `coverage/**` as its output; Turbo warns that it's missing until tooling-ci-cd/03 adds coverage.
- Remote cache needs `TURBO_TOKEN` and `TURBO_TEAM` in CI (tooling-ci-cd/01, manual).
- Git will normalise line endings on Windows; tooling-ci-cd/01 should add a `.gitattributes` (`* text=auto eol=lf`).
