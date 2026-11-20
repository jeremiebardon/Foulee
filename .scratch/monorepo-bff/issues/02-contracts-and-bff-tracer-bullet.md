# 02: Contracts package and BFF tracer bullet with a fake Activity source

**What to build:** A request travels end to end through every BFF layer, with Garmin faked. `packages/contracts` holds the v1 zod schemas (Activity summary, list response with cursor, error body with `unauthorized` and `garmin_access_expired`) and builds with tsup. `apps/bff` is a NestJS app in hexagonal layers for the Activity Import context: domain (Activity, Distance, Duration, Pace, ActivityKind, "only running is imported"), application (`ListActivitiesSince`, the `ActivitySource` port), infrastructure (an in-memory fake source for now) and HTTP interface (`GET /v1/activities?since=`, a bearer-token guard checking `BFF_ACCESS_TOKEN` in constant time, responses validated against the contracts). The BFF fails fast on boot when a required env var is missing and runs locally from a git-ignored `.env.local`. ESLint boundary rules enforce the layering.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] `packages/contracts` builds to ESM and CJS with types, and both apps can import it
- [ ] `GET /v1/activities` returns contract-valid, oldest-first running Activities after `since`, with the next cursor
- [ ] A missing or wrong bearer token returns `401` with the `unauthorized` error body
- [ ] Domain and application are unit-tested with a fake `ActivitySource`, with a 100% coverage threshold on those two layers
- [ ] HTTP behaviour is tested with Nest's testing module and supertest
- [ ] Lint fails on a deliberate import of `@nestjs/*` or infrastructure from `domain/` or `application/` (checked, then reverted)
- [ ] `pnpm --filter bff dev` starts the BFF locally; `.env.local` is git-ignored and an `.env.example` lists the variables
