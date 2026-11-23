# mobile

## 1.1.0

### Minor Changes

- 26a5b77: Import runs from Garmin: paste the BFF access token once in Settings, and the dashboard offers to import from Garmin. The import fetches new Garmin Activities when it opens and on pull-to-refresh, never the same one twice, and production builds fetch them from the Foulée BFF on Fly. A network failure, a refused token and an expired Garmin access each get their own message, and the rest of the app works as before when the BFF cannot be reached.
- 26a5b77: Link imported Garmin Activities to Sessions: the app suggests the Session planned on the Activity's local day, to confirm or decline, and any Session of the selected Plan can be picked by hand. Linking records the Activity's distance and duration on the Session; unlinking gives the Session back what had been logged on it by hand, or leaves it not done. Unplanned Activities show in the calendar on their day and count in the dashboard totals, without counting a linked Activity twice.
- fee5409: Native-only app (iOS and Android) with side-by-side development ("Foulée Dev") and production variants, a development build with dev tools, end-to-end flows, and over-the-air updates tied to the native fingerprint.
