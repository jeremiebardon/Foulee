# Release guide

This guide grows with the tooling-ci-cd work (spec issue #9). Today it covers the one-time GitHub setup. Agents never create the remote repository, accounts or tokens; you do these steps yourself.

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
   - Require branches to be up to date before merging.
   - Block force pushes and deletion of `main`; allow squash merging only.
   - Under Settings → General, enable "Automatically delete head branches".

Branch naming and commit rules are in `docs/agents/branching.md`.
5. **Enable the Turborepo remote cache** (optional but recommended; CI works without it):
   - Create a Vercel team token (or your remote-cache provider's) and add it as the repository **secret** `TURBO_TOKEN`.
   - Add the team slug as the repository **variable** `TURBO_TEAM`.

## One-time Expo and EAS setup

Builds, store submissions and over-the-air updates run on EAS (ADR 0001). Run every command below from `apps/mobile`, where `eas.json` lives. EAS CLI runs through `pnpm dlx`; pnpm refuses to run its dependencies' build scripts unless you allow them, so the commands below name the two it needs.

```bash
cd apps/mobile
alias eas='pnpm dlx --allow-build=protobufjs --allow-build=dtrace-provider eas-cli@latest'
```

1. **Create an Expo account** at <https://expo.dev/signup> (or use your existing one), then **log in**: `eas login`. Check it with `eas whoami`.
2. **Create the EAS project**: `eas init`. It creates the project on expo.dev and prints its project ID. The app config is TypeScript (`app.config.ts`), so EAS cannot write the ID itself. Add it by hand, together with your account name, and commit the change (neither value is secret):

   ```ts
   // app.config.ts, inside the returned object
   owner: '<your-expo-account>',
   extra: { eas: { projectId: '<project-id>' } },
   ```

   Run `eas init` again afterwards: it should report the project as already linked.
3. **Create a GitHub access token for EAS** so GitHub Actions can start EAS jobs: on expo.dev, open Account settings → Access tokens, create a token (a robot user's token, with only the role CI needs, is safer than a personal one), and add it as the GitHub repository **secret** `EXPO_TOKEN` (Settings → Secrets and variables → Actions). GitHub holds no other Expo, Apple or Google credential: the App Store Connect API key and the Play service account live in EAS credentials (set up with the store-release steps).
4. **Connect the GitHub repository** to the Expo project (expo.dev → Project settings → GitHub), with `apps/mobile` as the base directory, so EAS Workflows can run from the repository.
5. **Register iOS test devices** for internal distribution: `eas device:create`, then open the link on each iPhone. Device builds made before a device is registered do not install on it.

## Development builds

Daily work runs on a development build (the `development` variant with `expo-dev-client`), not Expo Go.

- **Local build**, no EAS needed: `APP_VARIANT=development pnpm exec expo run:android` (or `run:ios` on macOS) generates the native project and installs "Foulée Dev". Then `pnpm exec expo start` serves the bundle it loads. Switching variant on the same machine needs `pnpm exec expo prebuild --clean` first.
- **Cloud build on demand**: the manual EAS workflow `.eas/workflows/development-build.yml` builds the `development` profile (internal distribution) for Android, an iOS device, and the iOS simulator (`development-simulator` profile). Start it from the project's Workflows page on expo.dev, or with `eas workflow:run .eas/workflows/development-build.yml -F platform=android` (`all`, `android` or `ios`). Each build page has an install link and a QR code.
- **Dev tools**, in development only: press `j` in the `expo start` terminal to open React Native DevTools with the Rozenite panels (Expo Atlas, performance monitor, React Navigation, require profiler), and `Shift+M` to open Drizzle Studio on the device database. Production bundles contain none of this code.

## What the PR check does

`.github/workflows/pr-checks.yml` runs on every pull request and every push to `main`:

1. Installs with `pnpm install --frozen-lockfile` (pnpm store cached).
2. Asks Turbo which projects are affected relative to the base branch (`turbo ls --affected`).
3. Runs `expo-doctor` in `apps/mobile` only when `mobile` is affected.
4. Runs `turbo run lint typecheck test --affected`.

A change to `apps/bff` alone skips the mobile tasks. A change to `packages/contracts` affects both apps, so both run.
