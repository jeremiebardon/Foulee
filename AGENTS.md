This is a pnpm + Turborepo monorepo (ADR 0004). The Expo/React Native mobile app lives in `apps/mobile`; prioritize mobile-first patterns, performance, and cross-platform compatibility there. Shared config lives in `packages/` (`@foulee/tsconfig`, `@foulee/eslint-config`). Everything below about Expo applies to `apps/mobile`.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `apps/mobile/package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

The package manager is pnpm (`pnpm-lock.yaml`); never use npm, yarn or bun here. From the repo root:

```bash
pnpm install                # install every workspace
pnpm turbo run lint typecheck test            # all projects
pnpm turbo run lint typecheck test --affected # only projects changed vs main
```

Expo commands run inside `apps/mobile` (`cd apps/mobile` first):

```bash
pnpm exec expo install <package>  # ALWAYS use instead of pnpm add — resolves SDK-compatible versions
pnpm exec expo start              # start the dev server
pnpm exec expo lint               # lint
pnpm exec tsc --noEmit            # typecheck
pnpm dlx expo-doctor              # diagnose dependency and config issues
pnpm exec expo install --fix      # fix incompatible package versions
```

Installs are isolated (pnpm's default, supported by Expo since SDK 54), so a native module's peer dependencies must be direct dependencies of `apps/mobile`. Run lint, typecheck and tests through Turbo before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `apps/mobile/src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI from `apps/mobile` (where `eas.json` lives) as `pnpm dlx eas-cli@latest <command>`; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `pnpm exec expo run:ios|android` in `apps/mobile` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md

## Agent skills

### Issue tracker

Issues and specs live in GitHub Issues on `jeremiebardon/Foulee` (via `gh`); specs are parent issues, tickets are sub-issues. See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary as GitHub labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.

### Branching

Trunk-based, branch per issue, never commit to `main`. Before implementing an issue, create its branch. See `docs/agents/branching.md`.
