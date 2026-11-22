# Foulée

Running training plans, offline-first: structured workouts, multi-week plans, a calendar and a dashboard, with runs imported from Garmin. An Expo SDK 58 app (Expo Router, expo-sqlite + Drizzle ORM) for **iOS and Android only** (ADR 0002).

## Repository layout

A pnpm + Turborepo monorepo (ADR 0004). Turbo's task graph decides what to lint, typecheck, test and deploy, so a change to `packages/contracts` re-checks both apps while a change to one app leaves the other alone.

| Path | What it is |
| --- | --- |
| `apps/mobile` | The Expo app. The phone's SQLite database is the source of truth (ADR 0005). |
| `apps/bff` | NestJS backend-for-frontend. It only reads the owner's Garmin Activities and serves them in Foulée's vocabulary (ADR 0005, 0007). Deployed to Fly.io. |
| `packages/contracts` | zod schemas for the app ↔ BFF HTTP API, shared by both apps. API shapes only, never domain models (ADR 0006). |
| `packages/release-tools` | CI scripts: affected projects, the changeset check, the release tag. |
| `packages/tsconfig`, `packages/eslint-config` | Shared TypeScript and ESLint config. |

## Getting started

Requirements: Node 24+, pnpm (the version `packageManager` pins in the root `package.json`), and Android Studio's emulator or Xcode (macOS) for a native build. Commands below are POSIX shell (Git Bash on Windows). Never use npm, yarn or bun here.

```bash
pnpm install
pnpm turbo run lint typecheck test              # every project
pnpm turbo run lint typecheck test --affected   # only what changed against main
```

### The app runs on a development build

Daily work runs on a **development build** of the development variant (with `expo-dev-client`), which includes every native module the app uses. Build and install it once, and again after each native change (a native module, the Expo SDK, native settings in `app.config.ts`); otherwise just start the server.

```bash
cd apps/mobile
pnpm android        # expo run:android: generates the native project, builds and installs "Foulée Dev"
pnpm ios            # expo run:ios, on macOS
pnpm start          # expo start: serves the bundle the development build loads
```

Without a local toolchain, build it in the cloud: the manual EAS workflow **Development build** (`apps/mobile/.eas/workflows/development-build.yml`) builds Android, an iOS device and the iOS simulator, each with an install link and a QR code. See "Development builds" in the [release guide](docs/release-guide.md#development-builds).

`android/` and `ios/` are generated (Continuous Native Generation) and git-ignored: never edit them, configure native behaviour in `apps/mobile/app.config.ts` and config plugins.

### Two variants, two env files

The app has two variants (`apps/mobile/src/shared/config/variant.ts`). They install side by side and never share data.

| | `development` | `production` |
| --- | --- | --- |
| Name, identifier | Foulée Dev, `com.jbardon.foulee.dev` | Foulée, `com.jbardon.foulee` |
| Database, URL scheme | `foulee-dev.db`, `foulee-dev://` | `foulee.db`, `foulee://` |
| Dev shortcuts (mock sign-in, demo plan) | on | off |
| Env file | `apps/mobile/.env.development` | `apps/mobile/.env.production` |
| `EXPO_PUBLIC_BFF_URL` | `http://localhost:3000` (local BFF) | `https://foulee-bff.fly.dev` |

`APP_VARIANT` picks the variant (the EAS build profiles set it). When it is unset, Expo CLI's mode decides: `expo start` and debug builds load `.env.development`, release builds, exports and EAS Update load `.env.production`. Both env files are committed and hold no secret: `EXPO_PUBLIC_*` values are inlined in the app in plain text. To override one locally (an Android emulator reaches the computer at `http://10.0.2.2:3000`, a phone at its LAN address), put it in a git-ignored `.env.development.local` instead of editing the committed file.

Switching variant on the same machine needs `pnpm exec expo prebuild --clean` before the next native build.

### First launch

In the development variant sign-in is a mock: the 6-digit code is shown on screen instead of emailed. The dashboard offers **Charger un exemple** to load a 10-week plan.

### Dev tools

In development only (production bundles contain none of this code), from the `pnpm start` terminal:

- `j` opens React Native DevTools with the Rozenite panels: Expo Atlas, performance monitor, React Navigation, require profiler.
- `Shift+M` opens Drizzle Studio on the device database.
- After editing `src/db/schema.ts`, run `pnpm db:generate` in `apps/mobile` to generate the migration.

## The BFF and the Garmin import

The app imports runs from Garmin through the BFF. Import is the only thing that needs it: with the BFF down or unreachable the rest of the app works as before. The BFF is single-user: it reads the owner's Garmin data with a Garmin Connect **Personal API Key** (ADR 0007), and the app proves it is the owner's phone with a shared **BFF access token**.

### Run the BFF locally

```bash
cp apps/bff/.env.example apps/bff/.env.local   # git-ignored
# edit apps/bff/.env.local: set GARMIN_PERSONAL_API_KEY and BFF_ACCESS_TOKEN
pnpm --filter bff dev                          # http://localhost:3000, rebuilds on change
curl http://localhost:3000/health
```

- `GARMIN_PERSONAL_API_KEY`: create one in Garmin Connect → Settings → **Personal API token** (<https://connect.garmin.com/app/settings/personalApiToken>). It expires after 30 days to one year.
- `BFF_ACCESS_TOKEN`: any random string of at least 32 characters, for example `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. The BFF refuses to boot with the placeholder or a shorter value.

`pnpm --filter bff dev` builds `packages/contracts` first, so a fresh clone needs no manual build. The BFF code is layered `domain/`, `application/`, `infrastructure/`, `interface/http/`, and ESLint keeps `domain/` and `application/` free of NestJS, infrastructure and HTTP.

### Set up the import in the app

1. Point the app at a BFF: the local one through `EXPO_PUBLIC_BFF_URL` (see "Two variants, two env files"), or the deployed one in a production build.
2. Open **Réglages** (top of the tabs), paste the BFF access token and save it. It is kept in the Keychain / Keystore.
3. On the dashboard, **Importer depuis Garmin** fetches the new Activities (again on pull-to-refresh). Linking one suggests the Session planned on its day, to confirm or decline.

An expired or revoked Garmin key makes the BFF answer `garmin_access_expired`, and the app says so: create a new key (see "Rotating secrets" in the release guide).

### Contracts

API shapes live only in `packages/contracts`, and changes inside `/v1` are additive only, because an app build already on a phone must keep working after a BFF deploy. After changing a schema:

```bash
pnpm --filter @foulee/contracts export:json-schema   # rewrites json-schema/v1.json: commit it
```

CI compares that file with `main`. The rules are in [`packages/contracts/README.md`](packages/contracts/README.md).

### Deploy

The BFF deploys itself to Fly.io (`https://foulee-bff.fly.dev`) on every push to `main` that affects it (`.github/workflows/deploy-bff.yml`). The Garmin key and the access token are Fly secrets; GitHub only holds a deploy token. One-time setup, rollback and secret rotation: [The BFF on Fly.io](docs/release-guide.md#the-bff-on-flyio).

## Tests

Three layers (ADR 0003). Every test file lives in a `__tests__` folder next to the code it tests; lint fails a `*.test.*` file anywhere else.

| Layer | Tool | Covers |
| --- | --- | --- |
| Unit | Jest | Pure domain code. |
| Integration | Jest + React Native Testing Library | Screens and hooks, with repositories mocked and the services (`src/shared/services`) faked. |
| End-to-end | Maestro, on a real build | Everything that touches SQLite: repositories, the database layer, route files. |

**Coverage is 100%** (lines, branches, functions, statements) in `apps/mobile`, `apps/bff` and `packages/contracts`, and `pnpm test` fails below it. In the app, the only exclusions are listed in `apps/mobile/jest.config.js` (repositories, `src/db`, `src/app` routes, `src/devtools`, test code), and inline `istanbul ignore` comments fail lint. Anything excluded must be reached by a Maestro flow.

```bash
pnpm turbo run test            # every project
cd apps/mobile && pnpm test    # one project
```

### Maestro locally

The flows in `apps/mobile/.maestro/` (sign in, workouts, plans, logging a run, dashboard, demo plan, linking a Garmin Activity) run against an **e2e build**: the production variant with `EXPO_PUBLIC_E2E=true`, which honours a reset link and answers the Garmin import with an in-app BFF stub, so no BFF or Garmin is needed. Install the [Maestro CLI](https://docs.maestro.dev/getting-started/installing-maestro) and start an Android emulator, then from `apps/mobile`:

```bash
APP_VARIANT=production EXPO_PUBLIC_E2E=true pnpm exec expo prebuild --platform android --clean
cd android && APP_VARIANT=production EXPO_PUBLIC_E2E=true ./gradlew :app:assembleRelease && cd ..
adb -s emulator-5554 install -r android/app/build/outputs/apk/release/app-release.apk
pnpm e2e --udid emulator-5554      # every flow; or one: maestro test .maestro/plan.yaml
pnpm exec expo prebuild --clean    # before going back to the development build
```

Use an emulator, not your phone: the e2e build replaces an installed production app. On Windows, build from a short path (such as `C:\foulee`): a deep checkout hits the 260-character limit in the native CMake steps. iOS (macOS): `APP_VARIANT=production EXPO_PUBLIC_E2E=true pnpm exec expo run:ios --configuration Release`, then `pnpm e2e`. Details: [End-to-end tests](docs/release-guide.md#end-to-end-tests-maestro).

## CI checks

| Workflow | When | What |
| --- | --- | --- |
| `.github/workflows/pr-checks.yml` (job `check`, required on `main`) | Every pull request and push to `main` | `expo-doctor` when the app is affected; `turbo run lint typecheck test --affected`; the contract compatibility check when `packages/contracts` is affected; on pull requests, a changeset is required when `apps/mobile` or `packages/contracts` changes. |
| `apps/mobile/.eas/workflows/e2e.yml` (EAS) | Pushes to `main` that touch the app or its packages, and the Version Packages pull request | Every Maestro flow on an Android emulator, reusing the e2e build while the native fingerprint is unchanged. |
| `.github/workflows/deploy-bff.yml` | Pushes to `main` that affect the BFF | Deploys the BFF to Fly.io and checks the running commit. |
| `.github/workflows/release.yml` | Every push to `main` | Keeps the Version Packages pull request up to date, and tags released versions. |

## Releasing the app

Releasing means merging a pull request; there is no manual build.

1. Every pull request that changes the app adds a changeset: `pnpm changeset` at the root, pick `mobile`, choose patch, minor or major, and write the changelog line. For a change users do not notice, `pnpm changeset --empty`.
2. On `main`, changesets keeps a `chore(release): version packages` pull request open that bumps `apps/mobile/package.json` and writes `apps/mobile/CHANGELOG.md`.
3. Merge it once its end-to-end run on EAS is green (`gh pr checks changeset-release/main`). The release workflow tags `vX.Y.Z` and creates the GitHub release.
4. The tag starts `apps/mobile/.eas/workflows/release.yml`: an over-the-air update when only JavaScript changed (same native fingerprint), otherwise store builds submitted to TestFlight and the Play internal track.
5. Promote to the App Store and Play production by hand.

The one-time GitHub, Expo/EAS, store and Fly.io setup, and what to do when a release fails, are in the **[release guide](docs/release-guide.md)**.

## App structure

Paths are relative to `apps/mobile/src`.

```
app/                Routes only (Expo Router). Each file re-exports a feature screen or wires navigators.
db/                 Drizzle schema, client, generated migrations, demo seed
features/
  auth/             Sign-in (mock gateway in development), session
  workouts/         Workout aggregate (steps + repeats)
  plans/            Plans and their Sessions, plan picker
  calendar/         Month view, log-a-run sheet
  dashboard/        Stats and the dashboard screen
  garmin/           BFF access token, Activity import, linking Activities to Sessions
shared/
  config/           Variants, runtime config, the e2e build guard
  lib/              Dates, formatting/parsing, ids
  services/         HttpClient, SecureStore, KvStore interfaces and their adapters
  ui/               Theme and UI kit
e2e/                Reset link and BFF stub, active only in e2e builds
devtools/           Rozenite and Drizzle Studio wiring, development only
test/               Fakes and fixtures for Jest
```

Each feature is split by role, in dependency order (ADR 0008): `domain/` (pure types and rules) → `data/` (`*.repository.ts` for the database, `*.api.ts` for the BFF, `*.store.ts` for the phone's storage) → `hooks/` → `components/` → `screens/`. A file imports its own folder and earlier ones only; other features import only a feature's `index.ts`. Features reach HTTP and storage only through `@/shared/services`. ESLint enforces all of this.

| Route | Screen |
| --- | --- |
| `/` (tab) | Dashboard |
| `/calendar` (tab) | Calendar |
| `/workouts`, `/workouts/new`, `/workouts/[id]`, `/workouts/[id]/edit` | Workouts: list, create, detail, edit |
| `/plans`, `/plans/[id]`, `/plans/[id]/edit` | Plans: list, detail, edit |
| `/settings` | Réglages: the BFF access token |
| `/garmin` | Garmin import |
| `/login` | Sign-in |

### Offline-first

SQLite on the device is the source of truth. Screens read through Drizzle's `useLiveQuery`, so any write re-renders every screen that shows the changed table, with no loading or network state to manage. `useLiveQuery` watches only a query's main table, so reads stay one table per query and are joined in memory. Deleting a plan or a workout cascades to its sessions through foreign keys. IDs are UUIDs, so rows created offline on two devices won't collide if a sync is added.

## Decisions

Architecture decisions are in [`docs/adr/`](docs/adr/); domain terms in [`GLOSSARY.md`](GLOSSARY.md).

- [0001: EAS instead of Fastlane for build, signing and deployment](docs/adr/0001-eas-instead-of-fastlane.md)
- [0002: iOS and Android only](docs/adr/0002-ios-and-android-only.md)
- [0003: Test layers: Jest stays free of native code, Maestro owns the database](docs/adr/0003-test-layers.md)
- [0004: pnpm + Turborepo monorepo](docs/adr/0004-pnpm-turborepo-monorepo.md)
- [0005: The BFF is an import source; the device stays the source of truth](docs/adr/0005-bff-is-an-import-source.md)
- [0006: Mobile and BFF share API contracts, never domain models](docs/adr/0006-shared-contracts-not-shared-domain.md)
- [0007: Garmin import is single-user, through the Garmin Connect Personal API](docs/adr/0007-single-user-garmin-personal-api.md)
- [0008: Mobile features are split by role, outside services behind interfaces](docs/adr/0008-mobile-feature-layout-by-role.md)

Contributing: branch per issue, Conventional Commits, squash merge (`docs/agents/branching.md`).
