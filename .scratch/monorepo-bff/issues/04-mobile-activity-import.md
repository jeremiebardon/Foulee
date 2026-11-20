# 04: Import Activities into the app

**What to build:** I can pull my Garmin runs into Foulée. A Settings screen takes the BFF access token and stores it with `expo-secure-store`; the BFF URL comes from `EXPO_PUBLIC_BFF_URL` in the variant env files (development: local BFF, production: the Fly URL). The Garmin import shows only when both are set. A new `garmin` feature, in the existing flat layout, adds an `activities` table keyed by Garmin activity id (with an optional link to a Session), a BFF client that parses responses with `packages/contracts`, and an import screen that fetches new Activities with pull-to-refresh, using a cursor stored on the device. Re-importing never duplicates. A network failure, `unauthorized` and `garmin_access_expired` each show their own message, and the rest of the app is unaffected when the BFF is unreachable.

**Blocked by:** 02, tooling-ci-cd/03, tooling-ci-cd/04

**Status:** ready-for-agent

- [ ] Expo SDK 58 docs were checked for `expo-secure-store`, and it is installed with `expo install` in the mobile workspace
- [ ] A Drizzle migration adds the `activities` table; the import is idempotent on Garmin activity id
- [ ] The import screen lists imported Activities and fetches new ones on pull-to-refresh
- [ ] The three error cases show distinct messages, verified in integration tests with the BFF client mocked
- [ ] The import entry point is hidden when the BFF URL or the token is missing
- [ ] The feature dependency direction becomes `workouts ← plans ← garmin ← calendar, dashboard`, and lint enforces it once tooling-ci-cd/06 has landed
