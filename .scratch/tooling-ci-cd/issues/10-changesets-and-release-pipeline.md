# 10: Changesets and the release pipeline

**What to build:** Releasing means merging a PR. Changesets is initialized for the monorepo and versions `apps/mobile` only (the BFF deploys continuously and is ignored by changesets). The app version is read from `apps/mobile`'s package manifest, and EAS manages build numbers remotely. CI fails when `apps/mobile` or `packages/contracts` changes without a changeset. The changesets GitHub Action keeps a "Version Packages" PR open; the Maestro flows also run on that PR. Merging it bumps the version, writes the changelog and tags `vX.Y.Z`. An EAS workflow then compares the native fingerprint (`fingerprint` runtime version policy). If unchanged, it publishes an update to the `production` channel. If changed, it builds the `production` profile for iOS and Android and submits to TestFlight and the Play internal track. Promotion to public store release stays manual. The release guide covers store credentials (App Store Connect API key and Play service account in EAS credentials) and the day-to-day release flow.

**Blocked by:** 04, 09

**Status:** ready-for-agent

- [ ] A PR touching app code without a changeset fails CI; a PR with one passes; a BFF-only PR needs none
- [ ] The store version shown in the app config equals the package manifest version
- [ ] The "Version Packages" PR is created and updated automatically, and Maestro runs on it
- [ ] A JS-only release publishes an OTA update; a native-changing release builds and submits both platforms (verified, or dry-run where store credentials are missing)
- [ ] For the mobile release, GitHub holds only `EXPO_TOKEN`; store credentials live in EAS
- [ ] The release guide documents the one-time store setup and the release flow
