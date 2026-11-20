# 05: Link Activities to Sessions; Unplanned Activities in stats

**What to build:** An imported run completes my plan with one tap. For each unlinked Activity, the app suggests the Session planned on the Activity's local day in the selected Plan. I confirm or decline. I can also link an Activity to any Session by hand (for a Session done a day late). Linking writes the Activity's distance and duration onto the Session, the same as logging a run by hand; unlinking clears them. One Activity completes at most one Session, and a Session has at most one Activity. An Activity left unlinked is an Unplanned Activity: it shows in the calendar on its day and counts in the dashboard totals.

**Blocked by:** 04

**Status:** ready-for-agent

- [ ] The suggestion and linking rules live in the `garmin` domain module and are unit-tested: same local day, rest day (no suggestion), two Activities on one day, a Session already linked, timezone edge around midnight
- [ ] Confirming, declining, manual linking and unlinking are covered by integration tests with repositories mocked
- [ ] The calendar shows Unplanned Activities on their day
- [ ] Dashboard totals include Unplanned Activities and don't double-count linked ones (unit-tested in the stats module)
- [ ] A Maestro flow imports from a BFF stub and links one Activity to a Session (once tooling-ci-cd/09 has landed)
