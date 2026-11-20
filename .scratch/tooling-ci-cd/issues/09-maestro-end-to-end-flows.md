# 09: Maestro end-to-end flows, locally and in CI

**What to build:** The real app, real database and repositories are verified end to end. Key controls carry stable `testID`s. An e2e-only launch argument or deep link resets to a known seeded state, and it is ignored in non-e2e builds. An `e2e` EAS build profile builds the production variant for the Android emulator and iOS simulator. Maestro flows cover: sign in (dev mock), create and edit a workout with repeats, create a plan and add sessions, log a run from the calendar, see stats on the dashboard, and load the demo plan. The flows run locally on both platforms, and an EAS workflow runs them on Android on pushes to `main` that affect `apps/mobile` or its dependencies (reusing a build when the fingerprint is unchanged).

**Blocked by:** 05

**Status:** ready-for-agent

- [ ] Every flow passes locally on the iOS simulator and the Android emulator
- [ ] The e2e seed entry point is unreachable in development and production store builds
- [ ] The EAS workflow runs all flows on Android on pushes to `main`, and is skipped when only `apps/bff` changed
- [ ] Flows select elements by `testID`, not by copy
- [ ] Together, the flows exercise everything excluded from Jest coverage (repositories, the database, navigation)
