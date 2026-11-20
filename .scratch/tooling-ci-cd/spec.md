# Spec: Tooling, testing and CI/CD foundation

Status: ready-for-agent

> **Monorepo update (2026-11-20):** the app now lives in `apps/mobile` of a pnpm + Turborepo monorepo (ADR 0004, `.scratch/monorepo-bff/`). Every path in this spec is relative to `apps/mobile`, commands run through pnpm and Turbo, and issue 01 here is blocked by `monorepo-bff/01`.

## Problem Statement

Foulée runs only on a developer's machine through Expo Go. It has no version control, no automated checks, no way to build or ship to the App Store or Play Store, and no separation between a development build and a production build. Tests cover only pure domain rules, so screens can break without anyone noticing, and nothing exercises the real app on a device. The feature-based layout exists but is held together only by convention, so it will erode as the app grows. There is no versioning or changelog, so nobody can tell which version a tester or user has.

## Solution

The app becomes a native-only (iOS and Android) project with a full development-to-store pipeline:

- Two app variants, **development** and **production**, which can sit side by side on one phone. Each has its own identity, name, database and dev-only features. Configuration comes from committed per-variant env files.
- Daily development runs on a development build (dev client) instead of Expo Go, with Rozenite and Drizzle Studio as debugging tools.
- One test runner (Jest + React Native Testing Library) for unit and integration tests with a 100% coverage threshold on feature and shared code. Maestro end-to-end flows run against a real build.
- Lint rules enforce the feature-based architecture.
- Every pull request runs automated checks on GitHub Actions and cannot merge into `main` unless they pass.
- Changesets drive versions and the changelog. Merging the release PR either ships an over-the-air update (JS-only changes) or builds and submits new binaries to TestFlight and the Play internal track (native changes), all through EAS.

## User Stories

1. As a developer, I want the project in a git repository on GitHub, so that changes are tracked and reviewable.
2. As a developer, I want `main` protected and only changed through pull requests, so that broken code never lands on the release branch.
3. As a developer, I want the web target removed, so that I only maintain, test and debug the platforms we ship.
4. As a developer, I want a development variant and a production variant of the app, so that I can test risky changes without touching the app I actually use.
5. As a developer, I want both variants installed on the same phone, so that my real training data in the production app stays safe while I develop.
6. As a developer, I want the development variant visibly named "Foulée Dev", so that I never confuse the two apps on my home screen.
7. As a developer, I want each variant to use its own database file, so that dev experiments never corrupt production data.
8. As a developer, I want the mock sign-in and the "load demo plan" button available only in the development variant, so that production users never see dev shortcuts.
9. As a developer, I want per-variant settings in committed env files, so that the variant differences are visible and reviewable in one place.
10. As a developer, I want secrets kept out of the repository and stored in EAS, so that a leaked repo never leaks credentials.
11. As a developer, I want the app version to come from a single source, so that the store version, changelog and git tag never disagree.
12. As a developer, I want to run the app on a development build instead of Expo Go, so that native modules and dev tools work like they will in production.
13. As a developer, I want to build and install the development build locally with one command, so that daily work needs no cloud build.
14. As a developer, I want to trigger a cloud development build on demand and install it from a link, so that I can test on a physical device without a cable.
15. As a developer, I want Rozenite dev tools (bundle inspection, performance monitor, navigation inspector, require profiler), so that I can diagnose slow screens, bundle bloat and navigation bugs.
16. As a developer, I want Drizzle Studio connected to the device database, so that I can inspect and edit local data while debugging.
17. As a developer, I want all dev tools excluded from production bundles, so that they cost nothing in size or performance for users.
18. As a developer, I want a single test runner for unit and integration tests, so that there is one config, one command and one coverage report.
19. As a developer, I want the existing domain tests to keep passing after the runner change, so that no coverage is lost.
20. As a developer, I want to render a screen in a test with its data source replaced by fakes, so that I can verify what the user sees and does without a native database.
21. As a developer, I want screen tests to assert on visible text, roles and user actions rather than internals, so that refactors don't break tests.
22. As a developer, I want a 100% coverage threshold on feature and shared code, so that untested logic cannot be merged.
23. As a developer, I want the code that can't run under Jest (repositories, database, route re-exports) excluded in one visible place, so that the threshold is honest and the exclusions are easy to review.
24. As a developer, I want inline coverage-ignore comments forbidden, so that nobody quietly dodges the threshold.
25. As a developer, I want tests next to the code they test, so that I find them immediately and they move with the feature.
26. As a developer, I want each feature to expose a public entry point, so that other features depend on its contract, not its internals.
27. As a developer, I want lint to fail when a feature deep-imports another feature's internals, so that boundaries hold without relying on code review.
28. As a developer, I want lint to fail when a domain file imports React, React Native or the database, so that domain rules stay pure and trivially testable.
29. As a developer, I want lint to enforce the dependency direction between features (workouts ← plans ← calendar, dashboard), so that no circular dependencies appear.
30. As a developer, I want Maestro flows for the core journeys (sign in, create a workout, create a plan, schedule and log a run, view the dashboard), so that the real app, real database and repositories are verified end to end.
31. As a developer, I want key controls to carry stable test IDs, so that end-to-end flows don't break when copy changes.
32. As a developer, I want end-to-end runs to start from a known seeded state, so that flows are deterministic.
33. As a developer, I want Maestro to run in the cloud on Android when `main` changes and on the release PR, so that regressions are caught before a release without slowing every PR.
34. As a developer, I want to run Maestro flows locally on the iOS simulator and the Android emulator, so that I can reproduce and write flows myself.
35. As a developer, I want every PR to run dependency health checks, lint, typecheck and tests with coverage, so that problems surface before review.
36. As a developer, I want a PR that changes app code without a changeset to fail, so that every user-facing change is recorded for the changelog.
37. As a developer, I want a "Version Packages" PR kept up to date automatically, so that releasing is just merging a PR.
38. As a developer, I want merging the release PR to bump the version, update the changelog and tag the release, so that every release is traceable.
39. As a developer, I want the release to check automatically whether native code changed, so that I don't have to decide between an OTA update and a store build.
40. As a developer, I want JS-only releases delivered as over-the-air updates to the production channel, so that fixes reach users in minutes without store review.
41. As a developer, I want native-changing releases built for both platforms and submitted to TestFlight and the Play internal track, so that testers get them without manual uploads.
42. As a developer, I want promotion to public store release to stay manual, so that I decide when users get a new binary.
43. As a developer, I want build numbers incremented automatically by EAS, so that store uploads never fail on a duplicate build number.
44. As a developer, I want OTA updates tied to a runtime version derived from the native fingerprint, so that an update never reaches a binary it is incompatible with.
45. As a developer, I want a written checklist of the one-time manual steps (Expo account, project init, store API keys, GitHub secret, branch protection), so that I can finish setup without guesswork.
46. As a developer, I want the README to describe the new workflow (dev build, variants, tests, release), so that the project is understandable from scratch.
47. As a future maintainer, I want the key decisions (EAS over Fastlane, native-only, test layers and coverage scope) recorded as ADRs, so that I don't undo them by mistake.

## Implementation Decisions

- **Repository and hosting:** git repository on GitHub, trunk-based with short-lived branches. `main` is protected and requires all PR checks.
- **Platforms:** iOS and Android only (ADR 0002). `react-native-web`, `react-dom`, the web section of the app config and web-only code paths (such as comments and branches about the async web SQLite worker) are removed.
- **App identity:** production `com.jbardon.foulee`, development `com.jbardon.foulee.dev`, the same for the iOS bundle identifier and the Android package. Development display name "Foulée Dev".
- **Dynamic app config:** the static app config becomes a TypeScript app config. A new **pure variant-resolution module** takes the variant (`development` | `production`, from `APP_VARIANT`) and returns the variant-specific values (bundle identifier, package, name, scheme, database file name, dev-feature flags). The app config is a thin wrapper around it. This is the one new test seam.
- **Version source:** the app config reads its version from the package manifest, which changesets bumps. EAS manages build numbers remotely (remote app version source, auto-increment on production builds).
- **Env files:** committed `.env.development` and `.env.production` contain only non-secret `EXPO_PUBLIC_*` values (for example the database name and dev-feature flags). `.env*.local` stays git-ignored. Secrets live only in EAS environment variables. The app reads variant flags through one small config accessor, so features never read `process.env` directly.
- **Dev-only features:** the mock auth gateway and the demo-seed action are available only when the development flag is on. Production keeps the auth port with no dev shortcut. The real auth adapter is out of scope.
- **Development build:** `expo-dev-client` is added. Expo Go is no longer supported in the docs.
- **Dev tools:** Rozenite is wired into the Metro config and enabled only in development. Plugins: Expo Atlas, performance monitor, React Navigation, require profiler; the exact package names are checked against Rozenite's docs at implementation time. Drizzle Studio is added through Expo's dev-tools plugin and hooked up to the database client in development only. Production bundles contain none of it.
- **Feature architecture (formalized, not restructured):** the flat per-feature layers stay (domain, repository, screens). Each feature gets a public entry point. ESLint boundary rules forbid deep cross-feature imports, forbid domain files from importing React, React Native or the database, and enforce the dependency direction workouts ← plans ← calendar, dashboard. Shared code may be imported by any feature but imports no feature. Route files keep re-exporting screens.
- **Test runner:** Vitest is replaced by Jest with the `jest-expo` preset and React Native Testing Library (ADR 0003). The existing domain tests are ported unchanged in intent. The `@` path alias keeps working in tests.
- **Coverage:** 100% lines, branches, functions and statements on feature and shared code. Repository modules, the database layer and route files are excluded in the Jest config, with a comment pointing to ADR 0003. Inline ignore comments are not allowed.
- **E2E:** Maestro flows live in a top-level Maestro directory. Key controls get stable `testID`s. A dedicated EAS build profile, `e2e`, builds the production variant as an Android emulator APK (plus an iOS simulator build for local use). It starts from a known state through a launch argument or deep link that is honoured only in e2e builds.
- **EAS configuration:** profiles `development` (dev client, internal distribution), `e2e` (production variant, simulator/emulator), `production` (store builds, auto-increment). Update channels: `production`. Runtime version policy: `fingerprint`.
- **CI (GitHub Actions, Linux, pnpm cache), on every PR and push to `main`:** one workflow runs `turbo run lint typecheck test --affected` across the monorepo, plus `expo-doctor` in `apps/mobile` when mobile is affected, then the changeset status check (fails when `apps/mobile` or `packages/contracts` changed without a changeset). Mobile tests run with coverage.
- **E2E pipeline (EAS Workflows):** only when `apps/mobile` or its dependencies are affected, on pushes to `main` and on the release PR, build the `e2e` Android profile (reusing a build when the fingerprint is unchanged) and run the Maestro flows.
- **Release pipeline:** changesets versions `apps/mobile` only (the BFF deploys continuously, see `monorepo-bff`). The changesets action maintains a "Version Packages" PR. Merging it bumps the version, writes the changelog and tags `vX.Y.Z`, then an EAS workflow compares the fingerprint: if unchanged, it runs an update to the `production` channel; if changed, it runs production builds for iOS and Android and submits them to TestFlight and the Play internal track. Store promotion is manual.
- **Development build workflow:** a manually triggered EAS workflow builds the `development` profile for internal distribution.
- **Credentials:** GitHub holds only `EXPO_TOKEN`. The App Store Connect API key and the Play service account live in EAS credentials. Accounts and tokens are created by the developer, not by an agent.
- **Documentation:** a release guide covering the one-time manual setup (Expo login, `eas init`, store keys, GitHub secret, branch protection) and the day-to-day release flow. The README is updated for dev builds, variants, tests and releases. ADRs 0001–0003 are already written.

## Testing Decisions

- **What a good test is:** it exercises external behaviour through the highest available seam: what the user sees (text, accessibility roles) and does (press, type), or the return value of a pure function. It never asserts on internal state, hook calls or component structure.
- **Seams (agreed):**
  1. **Repository modules** are the single mock seam for integration tests. A screen test renders the real screen, real shared UI and real domain code, with that feature's repository module replaced by fakes that return fixed data and record write calls.
  2. **The app UI through test IDs** is the Maestro seam. It is the only layer that touches SQLite, repositories and navigation for real.
  3. **The variant-resolution module** is unit-tested in Jest: each variant produces the expected identity, name, database file and flags.
- **Unit tests:** domain modules (workouts, plans, dashboard stats), shared lib (dates, format, id) and variant resolution. Prior art: the existing domain test files next to each module.
- **Integration tests:** every screen and non-trivial component in features and shared UI (list, editor and detail screens for workouts and plans, the calendar and log-run sheet, the dashboard, the login screen with the mock auth gateway, the auth provider, the plan picker, the UI kit). No prior art in the repo; these establish the pattern.
- **E2E flows:** sign in (dev mock), create and edit a workout with repeats, create a plan and add sessions, log a run from the calendar, see stats on the dashboard, load the demo plan. They cover everything excluded from coverage.
- **CI pipelines** are verified by running them on a real PR and a real release PR. They are not unit-tested.

## Out of Scope

- Fastlane, including store metadata and screenshot automation (ADR 0001, deferred).
- The web target in any form (ADR 0002).
- A preview or staging variant, and internal-tester distribution channels other than TestFlight and the Play internal track.
- A real authentication backend. (The Garmin BFF is specified separately in `.scratch/monorepo-bff/`.)
- Automated promotion to public store release.
- Maestro Cloud, and running iOS Maestro flows in CI.
- Restructuring features into subfolders.
- Creating Expo, Apple or Google accounts, API keys or tokens.

## Further Notes

- AGENTS.md rules apply: install dependencies with `expo install` run in the mobile workspace through pnpm, check the versioned Expo SDK 58 docs before using any Expo or EAS API, and never create or edit native folders by hand.
- Moving off Expo Go means the first run needs a local development build (`npx expo run:ios` / `run:android`).
- The 100% threshold should be turned on only once the integration suite is written, or CI will fail from the first commit. Land the runner and the tests before enforcing it.
- ADRs: 0001 (EAS instead of Fastlane), 0002 (iOS and Android only), 0003 (test layers and coverage scope), 0004 (pnpm + Turborepo monorepo).
