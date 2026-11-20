# 03: Garmin Personal API adapter

**What to build:** The BFF reads my real Activities from the Garmin Connect Personal API (ADR 0007). `GarminPersonalApiActivitySource` implements the `ActivitySource` port. It exchanges `GARMIN_PERSONAL_API_KEY` for a bearer token at Garmin's token endpoint, caches it in memory and reuses it while more than an hour remains, pages through the activity list for the requested range, keeps running Activities only, and maps them to the domain. An invalid or expired key becomes a domain error that the HTTP layer returns as `garmin_access_expired`. The adapter is wired in place of the fake outside tests. Tests run against recorded, anonymised Garmin responses; CI never calls Garmin.

**Blocked by:** 02

**Status:** ready-for-agent

- [ ] The data-call base host and the activity-list response fields are confirmed against Garmin's Swagger docs or the reference Python client (`garmin/connect-personal-api-python`), and the source is noted in the adapter
- [ ] A small script, run by the owner with their own key, records the token and activity-list responses and anonymises them into fixtures; the agent does not hold a real key
- [ ] Adapter tests cover the token exchange, token reuse, re-exchange near expiry, a 401 from an expired key, filtering to running, paging and mapping
- [ ] A local run with a real key in `.env.local` returns my recent runs from `GET /v1/activities` (verified by the owner)
- [ ] The key never appears in logs or error bodies
