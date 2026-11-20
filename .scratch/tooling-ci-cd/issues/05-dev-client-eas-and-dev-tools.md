# 05: Dev client, EAS setup and dev tools

**What to build:** Daily development runs on a development build instead of Expo Go. `expo-dev-client` is added, and EAS is configured with a `development` profile (dev client, internal distribution) and a manually triggered EAS workflow that builds it on demand. Rozenite is wired into Metro for development only, with the Expo Atlas, performance monitor, React Navigation and require profiler plugins (exact package names checked against Rozenite's docs). Drizzle Studio is connected to the database client through Expo's dev-tools plugin, also in development only. Production bundles contain none of these tools. The release guide gains the Expo-side manual steps (login, project init, the `EXPO_TOKEN` GitHub secret).

**Blocked by:** 04

**Status:** ready-for-agent

- [ ] A local development build starts on iOS and Android, and the development variant connects to Metro
- [ ] The EAS config has a `development` profile, and a manual workflow builds it
- [ ] Rozenite opens with the four plugins in a development build
- [ ] Drizzle Studio shows the device database in a development build
- [ ] A production bundle includes no Rozenite or Drizzle Studio code (verified, for example, by bundle inspection)
- [ ] The release guide lists the Expo and EAS manual steps; the agent creates no accounts or tokens
