# Garmin fixtures

Garmin Personal API responses replayed by the adapter tests (`fake-garmin.ts`), so CI never calls Garmin.

`pnpm record:garmin-fixtures` (from `apps/bff`, with your own `GARMIN_PERSONAL_API_KEY`) records the token response and the first three activity-list pages, anonymised, over these files. Review the diff, then update the values `garmin-personal-api-activity-source.test.ts` and `app.module.test.ts` assert.

Until the owner first runs it, these files are hand-written in the recorder's output format from Garmin's Personal API spec (SummarizedActivityDTO), not recorded.
