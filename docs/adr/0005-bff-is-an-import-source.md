# The BFF is an import source; the device stays the source of truth

The phone's SQLite database remains the source of truth for Workouts, Plans and Sessions. The BFF owns only Garmin-facing concerns: it holds Garmin access, reads Activities and serves them in Foulée's own vocabulary. The app pulls Activities from it and writes what it keeps into SQLite. The BFF never stores or serves Plans, Workouts or Sessions, so the app keeps working fully offline and the BFF can be down without breaking anything but import.

## Considered Options

- Make the BFF the backend for all data (server-side source of truth): rejected, because it would undo the offline-first design for a feature that is only an input.
