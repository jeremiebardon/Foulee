# Release guide

This guide covers the one-time GitHub, Expo and store setup, development builds, end-to-end tests, the PR checks and the day-to-day release flow (spec issue #9). Agents never create the remote repository, accounts or tokens; you do these steps yourself.

## One-time GitHub setup

1. **Create the repository** on GitHub (empty: no README, license or `.gitignore`). Keep it private or public as you prefer.
2. **Add the remote and push `main`** from the repo root:

   ```bash
   git remote add origin git@github.com:<you>/foulee.git
   git push -u origin main
   ```

3. **Open a first pull request** so the `PR checks` workflow runs once and its `check` job appears in GitHub's list of checks.
4. **Protect `main`** (Settings → Branches → Add branch ruleset / protection rule for `main`):
   - Require a pull request before merging.
   - Require status checks to pass, and select **`check`**. It is one job that always runs, so it never blocks a merge by being skipped.
   - Do not make the EAS end-to-end run a required check. It runs only on the Version Packages pull request (see "Releasing"), and a required check applies to every pull request into `main`: the others would wait forever for a status that never comes. Its gate is manual, in step 3 of "Releasing".
   - Require branches to be up to date before merging.
   - Block force pushes and deletion of `main`; allow squash merging only.
   - Under Settings → General, enable "Automatically delete head branches".

Branch naming and commit rules are in `docs/agents/branching.md`.
5. **Enable the Turborepo remote cache** (optional but recommended; CI works without it):
   - Create a Vercel team token (or your remote-cache provider's) and add it as the repository **secret** `TURBO_TOKEN`.
   - Add the team slug as the repository **variable** `TURBO_TEAM`.
6. **Let the release workflow open pull requests**: Settings → Actions → General → Workflow permissions, tick **Allow GitHub Actions to create and approve pull requests**. Without it, the changesets action cannot open the Version Packages pull request.

## One-time Expo and EAS setup

Builds, store submissions and over-the-air updates run on EAS (ADR 0001). Run every command below from `apps/mobile`, where `eas.json` lives. EAS CLI runs through `pnpm dlx`; pnpm refuses to run its dependencies' build scripts unless you allow them, so the commands below name the two it needs.

```bash
cd apps/mobile
alias eas='pnpm dlx --allow-build=protobufjs --allow-build=dtrace-provider eas-cli@latest'
```

1. **Create an Expo account** at <https://expo.dev/signup> (or use your existing one), then **log in**: `eas login`. Check it with `eas whoami`.
2. **Create the EAS project**: `eas init`. It creates the project on expo.dev and prints its project ID. The app config is TypeScript (`app.config.ts`), so EAS cannot write the ID itself, nor the update URL that `eas update:configure` would add. Add them by hand, together with your account name, and commit the change (none of these values is secret):

   ```ts
   // app.config.ts, inside the returned object
   owner: '<your-expo-account>',
   extra: { eas: { projectId: '<project-id>' } },
   updates: { url: 'https://u.expo.dev/<project-id>' },
   ```

   Run `eas init` again afterwards: it should report the project as already linked. `runtimeVersion` (the `fingerprint` policy) and the `production` channel in `eas.json` are already set, so `eas update:configure` has nothing left to do.
3. **GitHub secrets**: none is needed for EAS. EAS starts its workflows itself, through the GitHub connection of the next step, so GitHub holds no Expo, Apple or Google credential: the App Store Connect API key and the Play service account live in EAS credentials (see "One-time store setup"). If you ever make a GitHub Actions job call EAS CLI, `EXPO_TOKEN` is the only secret to add for it: on expo.dev, Account settings → Access tokens (a robot user's token is safer than a personal one), then add it as the repository **secret** `EXPO_TOKEN`.
4. **Connect the GitHub repository** to the Expo project (expo.dev → Project settings → GitHub), with `apps/mobile` as the base directory, so EAS Workflows can run from the repository.
5. **Register iOS test devices** for internal distribution: `eas device:create`, then open the link on each iPhone. Device builds made before a device is registered do not install on it.

## Development builds

Daily work runs on a development build (the `development` variant with `expo-dev-client`), not Expo Go.

- **Local build**, no EAS needed: `APP_VARIANT=development pnpm exec expo run:android` (or `run:ios` on macOS) generates the native project and installs "Foulée Dev". Then `pnpm exec expo start` serves the bundle it loads. Switching variant on the same machine needs `pnpm exec expo prebuild --clean` first.
- **Cloud build on demand**: the manual EAS workflow `.eas/workflows/development-build.yml` builds the `development` profile (internal distribution) for Android, an iOS device, and the iOS simulator (`development-simulator` profile). Start it from the project's Workflows page on expo.dev, or with `eas workflow:run .eas/workflows/development-build.yml -F platform=android` (`all`, `android` or `ios`). Each build page has an install link and a QR code.
- **Dev tools**, in development only: press `j` in the `expo start` terminal to open React Native DevTools with the Rozenite panels (Expo Atlas, performance monitor, React Navigation, require profiler), and `Shift+M` to open Drizzle Studio on the device database. Production bundles contain none of this code.

## End-to-end tests (Maestro)

The Maestro flows in `apps/mobile/.maestro/` (sign in, workouts, plans, logging a run, dashboard, demo plan) run against an **e2e build**: the production variant (`APP_VARIANT=production`) with `EXPO_PUBLIC_E2E=true`. Only such a build honours the reset link `foulee://e2e?seed=empty|demo&signedIn=true` that each flow opens after clearing the app's data, and it turns the dev shortcuts on (mock sign-in, demo plan). Development builds and store builds ignore the link. Flows select elements by `testID` only.

The e2e flag can never ship. `app.config.ts` throws when `EXPO_PUBLIC_E2E=true` is evaluated under any EAS build profile other than `e2e` (EAS sets `EAS_BUILD_PROFILE` on its build workers), so a `production` or `development` build that picks it up fails. An update has no build profile, so the release workflow runs the same check as the `production` profile before each update (its `before_update` hook). Local builds have no profile and are not checked, which keeps the local e2e build below working.

- **In CI**: `.eas/workflows/e2e.yml` runs every flow on an Android emulator on pushes to `main` that touch `apps/mobile`, its workspace packages or the lockfile, and on the Version Packages pull request. It looks up an `e2e` build with the same native fingerprint and repacks it with the new JavaScript, or builds one when the fingerprint changed.
- **Locally on Android** (Maestro CLI and an emulator running): build and install the release APK, then run the flows from `apps/mobile`:

  ```bash
  APP_VARIANT=production EXPO_PUBLIC_E2E=true pnpm exec expo prebuild --platform android --clean
  cd android && APP_VARIANT=production EXPO_PUBLIC_E2E=true ./gradlew :app:assembleRelease && cd ..
  adb -s emulator-5554 install -r android/app/build/outputs/apk/release/app-release.apk
  pnpm e2e --udid emulator-5554     # all flows; or: maestro test .maestro/plan.yaml
  ```

  Pass `--udid` whenever a phone is plugged in too, so nothing runs on it. On Windows, a deep checkout path (a git worktree under `.claude/worktrees/`, say) makes the native CMake steps fail on the 260-character path limit; build from a short path such as `C:\foulee`. The e2e build replaces an installed production app (same identity and database file): use an emulator, not your phone. Run `pnpm exec expo prebuild --clean` again before going back to a development build.
- **Locally on iOS** (macOS): `APP_VARIANT=production EXPO_PUBLIC_E2E=true pnpm exec expo run:ios --configuration Release`, then `pnpm e2e`. Or build the `e2e` profile on EAS, which also makes an iOS simulator build.

## What the PR check does

`.github/workflows/pr-checks.yml` runs on every pull request and every push to `main`:

1. Installs with `pnpm install --frozen-lockfile` (pnpm store cached).
2. Asks Turbo which projects are affected relative to the base branch (`turbo ls --affected`).
3. Runs `expo-doctor` in `apps/mobile` only when `mobile` is affected.
4. Runs `turbo run lint typecheck test --affected`.
5. On pull requests, runs the **changeset check** (`packages/release-tools/bin/check-changeset.js`): it fails when the pull request changes anything under `apps/mobile` or `packages/contracts` (the app bundles the contracts) without adding a file to `.changeset/`. Then `changeset status` validates the changesets themselves. The Version Packages pull request is exempt, since it consumes the changesets.

A change to `apps/bff` alone skips the mobile tasks and needs no changeset. A change to `packages/contracts` affects both apps, so both run, and it needs a changeset.

The workflow can also be started by hand (`workflow_dispatch`); the release workflow does that on the Version Packages pull request (see below).

## One-time store setup

Do this once, after the Expo setup above. Every credential goes to EAS, never to GitHub. Run the commands from `apps/mobile` with the `eas` alias defined above.

**Apple (TestFlight)**

1. Join the Apple Developer Program, then create the app in App Store Connect (Apps → New App) with the bundle ID `com.jbardon.foulee`. If the bundle ID is not listed yet, `eas credentials --platform ios` (or the first `eas build --platform ios --profile production`) registers it.
2. `eas credentials --platform ios`, pick the `production` profile, sign in to Apple, and let EAS create the distribution certificate and provisioning profile.
3. In the same menu: **App Store Connect: Manage your API Key** → **Set up your project to use an API Key for Expo Submit**. EAS creates the App Store Connect API key and keeps it; this is what lets the release workflow submit without you.
4. Copy the app's **Apple ID** (App Store Connect → the app → App Information; a number) into `eas.json` and commit it (it is not secret; non-interactive submits need it):

   ```json
   "submit": { "production": { "ios": { "ascAppId": "<apple-id>" }, "android": { ... } } }
   ```

**Google (Play internal track)**

1. Create a Play developer account and the app in Play Console with the package `com.jbardon.foulee`.
2. Create a Google service account with access to the app in Play Console (Expo's guide: <https://expo.fyi/creating-google-service-account>) and download its JSON key.
3. Upload the key to EAS: expo.dev → the project → Credentials → Android → `com.jbardon.foulee` → **Add a Google service account key**, or `eas credentials --platform android` → `production` → Google Service Account. Delete the local JSON file afterwards; `.gitignore` does not cover it.
4. The upload keystore is created by EAS on the first production build (or now, through `eas credentials --platform android`).
5. While the app has never been published, Play only accepts draft releases. If the first submit fails with a message about draft apps, set `"releaseStatus": "draft"` under `submit.production.android` in `eas.json`, roll that first internal release out by hand in Play Console, then set it back to `"completed"`.

**Build numbers**: EAS keeps them (`"appVersionSource": "remote"` in `eas.json`) and increments them on every production build (`autoIncrement`). A new app starts at 1. If a store already has builds of this app, run `eas build:version:set` once per platform with the last number it has.

## Releasing

Releasing means merging a pull request. Changesets versions one package, the app (`mobile` in `apps/mobile`); the BFF deploys on its own and the `@foulee/*` packages are internal, so `.changeset/config.json` ignores them. The app version lives only in `apps/mobile/package.json`: `app.config.ts` reads it (`scripts/check-app-config.js` checks this on every lint), and EAS adds the build numbers.

1. **Every pull request that changes the app** adds a changeset: run `pnpm changeset` at the repository root, pick `mobile`, choose patch, minor or major, write the line users will read in the changelog, and commit the file. For a change users do not notice (tests, tooling), `pnpm changeset --empty` satisfies the check without releasing anything.
2. **On every push to `main`**, `.github/workflows/release.yml` runs the changesets action. While changesets are waiting, it keeps a pull request titled `chore(release): version packages` open on the branch `changeset-release/main`, and updates it on each push. It bumps the version in `apps/mobile/package.json` and writes `apps/mobile/CHANGELOG.md`.
   - Pushes made with the workflow's own token start no other GitHub workflow, so the release workflow then dispatches `PR checks` on that branch, which reports the required `check` on the pull request.
   - EAS runs the Maestro flows on it (`.eas/workflows/e2e.yml` matches the head branch `changeset-release/main`). EAS reports the run to GitHub as a commit status on the pull request's head commit, next to `check`. Expo's docs do not name that status, and it cannot be a required check (see "One-time GitHub setup"), so step 3 is the gate.
3. **Merge the Version Packages pull request** (squash) when you want to ship, and only once the end-to-end run on its latest commit is green. GitHub does not enforce this, so check it each time. `gh pr checks changeset-release/main` lists the EAS status beside `check`, or open expo.dev → the project → Workflows and find the `E2E (Android)` run for that commit. If that run failed, is still running, or is missing, do not merge: fix it, or re-run it from expo.dev. The next run of the release workflow tags that commit `vX.Y.Z` and creates the GitHub release with its changelog entry (`packages/release-tools/bin/tag-release.js`; it does nothing when the version is already tagged, or has no changelog entry yet).
4. **EAS ships it.** The tag starts `.eas/workflows/release.yml`. It computes the native fingerprint of the production variant and looks for a `production` store build with the same fingerprint, per platform:
   - found: only JavaScript and assets changed, so it publishes an over-the-air update on the `production` channel. Users get it on the next app launches. The `fingerprint` runtime version policy keeps the update off binaries it does not fit.
   - not found: native code changed (a native module, the Expo SDK, the app config's native settings), so it builds the `production` profile and submits it to TestFlight and the Play internal track.
5. **Promote by hand** when the testers are happy: submit the TestFlight build for App Store review in App Store Connect, and promote the internal release to production in Play Console. Nothing automates this step.

Follow a release on expo.dev → the project → Workflows. To run a release again (for example after a failed submit), start it from there or with `eas workflow:run .eas/workflows/release.yml --ref vX.Y.Z`. If a store build was made but never submitted, submit it (`eas submit --platform <platform> --id <build-id>`) before the next release: a later JavaScript-only release would otherwise update a binary nobody has.

**Why the tag starts EAS, and not GitHub.** EAS Workflows can start on a tag push (`on: push: tags`), through the GitHub connection, and then run from that exact commit. The alternative, a GitHub Actions step calling `eas workflow:run` with `EXPO_TOKEN`, would put an Expo token in GitHub and add EAS CLI to the runner, for the same result. With the tag trigger, GitHub holds no release credential at all, a release can be re-run from expo.dev or by tag, and the GitHub workflow only does what changesets needs (version, tag, GitHub release).
