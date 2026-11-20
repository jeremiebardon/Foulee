# Garmin import is single-user, through the Garmin Connect Personal API

The BFF reads one runner's (the owner's) Garmin data with a Personal API Key held as a deployment secret. Garmin states the Personal API is "not intended for commercial applications serving multiple end users", and it is read-only, so the BFF cannot send Workouts to a watch and must not be opened to other Foulée users with their own keys. Garmin access sits behind an `ActivitySource` port, so a multi-user adapter for Garmin's business Developer Program can replace it without changing the BFF domain or the contracts.

## Considered Options

- Multi-user, each user pasting their own Personal API Key: rejected, it is the use Garmin's terms exclude.
- Garmin Connect Developer Program (OAuth, webhooks, Training API): deferred, it requires an approved business account.
- Unofficial Garmin Connect login with username and password: rejected, fragile and against Garmin's terms now that an official personal route exists.

## Consequences

- The Personal API Key expires (at most one year) and is rotated by hand; the BFF reports an expired key as its own error so the app can say so.
- With no webhooks and no refresh tokens, the BFF exchanges the key for a 24-hour token on demand and the app pulls new Activities.
