---
"mobile": minor
---

Import runs from Garmin: paste the BFF access token once in Settings, and the dashboard offers to import from Garmin. The import fetches new Garmin Activities when it opens and on pull-to-refresh, never the same one twice, and production builds fetch them from the Foulée BFF on Fly. A network failure, a refused token and an expired Garmin access each get their own message, and the rest of the app works as before when the BFF cannot be reached.
