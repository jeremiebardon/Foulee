# Spec: Monorepo and Garmin import through a NestJS BFF

Status: ready-for-agent

## Problem Statement

Every run I do is recorded by my Garmin watch, but Foulée only knows about a run if I type its distance and duration into the "log a run" sheet. The data already exists in Garmin Connect, and Garmin now offers a Personal API that lets me read my own data. Nothing in the project can talk to it: the repository holds a single Expo app, there is no server to keep my Garmin key off the phone, and there is no shared definition of what crosses the network between an app and a server.

## Solution

The repository becomes a pnpm + Turborepo monorepo (ADR 0004) with three projects:

- `apps/mobile`: the existing Expo app, moved unchanged.
- `apps/bff`: a NestJS backend-for-frontend, organised in hexagonal layers with a DDD domain, that reads my Activities from the Garmin Connect Personal API (ADR 0007).
- `packages/contracts`: zod schemas for the app ↔ BFF API, shared by both (ADR 0006).

The app pulls new Activities from the BFF when I ask for them and stores them in its own SQLite database, which stays the source of truth (ADR 0005). For each Activity it suggests the Session planned that day; I confirm the link, and the Session is done. Activities I don't link stay as Unplanned Activities and still count in my stats.

CI checks only the projects a change affects, the BFF deploys to Fly.io on its own, and the mobile release pipeline from the tooling-ci-cd spec runs only when the app is affected.

## User Stories

1. As a runner, I want my Garmin runs to appear in Foulée without typing them, so that my training log is complete and accurate.
2. As a runner, I want to fetch new runs when I open the import or pull to refresh, so that I control when the app talks to the network.
3. As a runner, I want each imported run to suggest the Session planned that day, so that completing my plan takes one tap.
4. As a runner, I want to confirm or decline that suggestion, so that a run on the wrong day never completes the wrong Session.
5. As a runner, I want to link a run to a Session by hand when there is no suggestion (a Session done a day late), so that my plan reflects reality.
6. As a runner, I want a run I don't link to stay visible as an Unplanned Activity, so that extra runs are not lost.
7. As a runner, I want Unplanned Activities to count in my dashboard totals, so that my weekly volume is right.
8. As a runner, I want a run that is already imported never to be imported twice, so that my totals are not doubled.
9. As a runner, I want only running Activities imported, so that a bike ride or a swim doesn't pollute my running plan.
10. As a runner, I want the app to tell me plainly when my Garmin access has expired, so that I know to create a new Personal API Key.
11. As a runner, I want the app to keep working fully when the BFF or Garmin is unreachable, so that importing is the only thing that fails.
12. As the owner, I want my Personal API Key stored only on the server, never in the app, so that a lost phone or an extracted app bundle doesn't expose my Garmin data.
13. As the owner, I want the app to prove it is mine with a BFF access token I paste once in Settings, so that nobody else can read my Garmin data through the BFF.
14. As the owner, I want the Garmin import hidden until a BFF URL and token are set, so that the app looks normal when no BFF is configured.
15. As a developer, I want the mobile app, the BFF and the shared contracts in one repository, so that a contract change and both its consumers land in one PR.
16. As a developer, I want the API contracts defined once as zod schemas, so that the BFF and the app can't disagree on a field without a failing check.
17. As a developer, I want the BFF to validate what it sends against the contracts, so that a mapping bug surfaces as a test failure, not as bad data on my phone.
18. As a developer, I want the app to parse BFF responses with the same contracts, so that an incompatible BFF is detected at the boundary.
19. As a developer, I want the API versioned under `/v1` with additive-only changes, so that an older app build keeps working after a BFF deploy.
20. As a developer, I want CI to fail when a contract change would break an existing `/v1` client, so that I can't ship a breaking change by accident.
21. As a developer, I want the BFF domain and application layers free of NestJS and Garmin code, so that the rules are tested without a framework and Garmin can be swapped out.
22. As a developer, I want lint to fail when the domain or application layer imports infrastructure, the HTTP interface or `@nestjs/*`, so that the hexagonal boundaries hold without code review.
23. As a developer, I want Garmin reached only through an `ActivitySource` port, so that a multi-user Garmin Developer Program adapter can replace the Personal API later.
24. As a developer, I want the Garmin adapter tested against recorded, anonymised Garmin responses, so that CI never calls Garmin and never needs my key.
25. As a developer, I want the BFF to exchange the Personal API Key for a token only when needed and reuse it while it is valid, so that I don't hammer Garmin's token endpoint.
26. As a developer, I want PR checks to run lint, typecheck and tests only for the projects a change affects, so that a BFF-only change doesn't wait on mobile checks and the other way round.
27. As a developer, I want a change to `packages/contracts` to re-check both apps, so that a shared change is never under-tested.
28. As a developer, I want Turborepo's remote cache on, so that unchanged tasks are restored instead of re-run.
29. As a developer, I want the BFF deployed to Fly.io on every push to `main` that affects it, so that it is always current without manual steps.
30. As a developer, I want BFF deploys skipped when only the app changed, so that deploys reflect real BFF changes.
31. As a developer, I want each BFF image tagged with its git SHA, so that I can tell which commit is running.
32. As a developer, I want the development app variant to point at my local BFF and the production variant at Fly, so that I can develop the import without touching production.
33. As a developer, I want to run the BFF locally with one command and a git-ignored env file, so that I can develop it without deploying.
34. As a developer, I want a written checklist of the one-time manual steps (Fly account and app, Fly secrets, GitHub secret, creating the Personal API Key), so that I can finish setup without guesswork.
35. As a future maintainer, I want the monorepo, the BFF's role, the shared-contracts rule and the single-user Garmin constraint recorded as ADRs, so that I don't undo them by mistake.

## Implementation Decisions

- **Workspace:** pnpm workspaces and Turborepo. Layout: `apps/mobile`, `apps/bff`, `packages/contracts`, `packages/tsconfig`, `packages/eslint-config`. `package-lock.json` is replaced by `pnpm-lock.yaml`. Turbo tasks: `build`, `lint`, `typecheck`, `test`, `dev`, with `build` depending on `^build`. Remote cache is on. The Expo SDK 58 monorepo guide is checked for Metro and pnpm settings before the move; AGENTS.md is updated so its commands run from the right workspace (for example `pnpm --filter mobile exec expo install`).
- **Contracts package:** zod schemas plus inferred types, built with tsup to ESM and CJS with `.d.ts`, consumed by both apps as a built workspace dependency. Contains API contracts only: no domain types, no Garmin shapes. v1 contents: the Activity summary (Garmin activity id, start time with timezone, distance in meters, duration in seconds, average pace in seconds per km, optional average heart rate), the list response with a cursor, and the error body with codes including `unauthorized` and `garmin_access_expired`.
- **API:** `GET /v1/activities?since=<cursor>` returns running Activities started after the cursor, oldest first, with the next cursor. Every request needs `Authorization: Bearer <BFF access token>`, checked against a server secret in constant time. Changes inside `/v1` are additive only.
- **BFF shape (one bounded context, Activity Import):**
  - `domain/`: the Activity and its value objects (Distance, Duration, Pace, ActivityKind), with rules such as "only running kinds are imported". Plain TypeScript.
  - `application/`: the `ListActivitiesSince` use case and the outbound `ActivitySource` port.
  - `infrastructure/`: `GarminPersonalApiActivitySource`. It exchanges the Personal API Key for a bearer token at Garmin's token endpoint, caches the token in memory and reuses it while more than an hour remains, maps Garmin's activity list to the domain, and turns an invalid or expired key into a domain error that becomes `garmin_access_expired`.
  - `interface/http/`: the controller, the bearer-token guard and validation against `packages/contracts`.
  - ESLint boundary rules forbid `domain/` and `application/` from importing `infrastructure/`, `interface/` or `@nestjs/*`, and forbid `domain/` from importing `application/`.
- **Garmin Personal API facts (checked 2026-11-20, see ADR 0007):** the key is created at Garmin Connect → Settings → Personal API token, expires in 30 days to one year, and is exchanged with `POST https://personal.connectapi.garmin.com/personalapitoken-service/personal-api/personal-api-key/token` (`Authorization: ApiKey …`) for a token valid 24 hours. There is no refresh token and no webhook. The activity list is `GET /activitylist-service/activities/search/activities` (params `start`, `limit`, `startDate`, `endDate`, `activityType`), per Garmin's reference Python client. The API base host for data calls and the response fields are not documented on the public pages; the implementer confirms them against Garmin's Swagger page (signed in) or the reference client before writing the adapter.
- **BFF persistence:** none. The only state is the in-memory Garmin token.
- **BFF configuration:** `GARMIN_PERSONAL_API_KEY` and `BFF_ACCESS_TOKEN` are Fly secrets in production and live in a git-ignored `.env.local` locally. The BFF fails fast on boot when either is missing.
- **Mobile side:**
  - `EXPO_PUBLIC_BFF_URL` comes from the variant env files (development: local BFF; production: the Fly URL). The BFF access token is entered once in a Settings screen and stored with `expo-secure-store`.
  - A new `activities` table holds imported Activities, keyed by Garmin activity id so re-imports are idempotent, with an optional link to a Session. The import cursor is stored on the device.
  - A new feature (working name `garmin`, following the existing flat feature layout) owns the domain rules (suggest the Session planned the Activity's local day, one Activity completes at most one Session), the repository and the screens. Linking an Activity writes its distance and duration onto the Session, the same as logging a run by hand.
  - The dashboard counts Unplanned Activities. The feature dependency direction becomes `workouts ← plans ← garmin ← calendar, dashboard`.
  - The app parses BFF responses with `packages/contracts`. A network failure, `unauthorized` and `garmin_access_expired` each get their own message.
- **CI:** one PR workflow on `pull_request` and `push` to `main` runs `turbo run lint typecheck test --affected` with the pnpm cache. A contract-compatibility step, run when `packages/contracts` is affected, exports the v1 schemas to JSON Schema, compares them with `main` and fails on removed or renamed fields, newly required fields or narrowed types.
- **BFF CD:** a workflow on push to `main` runs only when the BFF is affected (`turbo-ignore` or `turbo ls --affected`). It builds the image from `turbo prune bff --docker` output, tags it with the git SHA and runs `fly deploy`. GitHub holds `FLY_API_TOKEN`. There are no changesets and no semver for the BFF.
- **Mobile CI/CD:** the tooling-ci-cd pipelines (Maestro on `main` and on the release PR, changesets, EAS release) run only when `apps/mobile` or its dependencies are affected. The changeset-required check applies to changes under `apps/mobile` and `packages/contracts`.
- **Environments:** one deployed BFF (production on Fly) and local development. No staging.
- **Manual setup (not done by an agent):** Fly account and app, `fly secrets set` for both secrets, the `FLY_API_TOKEN` GitHub secret, creating the Personal API Key, and the Turborepo remote cache token.

## Testing Decisions

- **What a good test is:** it exercises behaviour through the highest available seam: the HTTP response for a request, the return value of a use case or domain function, or what the user sees and does in the app. It never asserts on internal calls or framework wiring.
- **Runner:** Jest across the repo (ADR 0003), one config per project, run through Turbo.
- **BFF seams:**
  1. **Domain and application**, unit-tested with a fake `ActivitySource`. 100% coverage threshold on `domain/` and `application/`.
  2. **The Garmin adapter**, tested against recorded and anonymised Garmin JSON fixtures served by an HTTP mock. Covers the token exchange, token reuse and expiry, the 401 that means an expired key, filtering to running, and mapping. No coverage threshold; the tests are required.
  3. **HTTP**, tested with Nest's testing module and supertest, with the adapter replaced by the fake. Covers the bearer guard, the `since` parameter, error codes and contract-valid responses.
- **Contracts:** unit tests for the schemas' edge cases (optional heart rate, timezone handling) and the compatibility check run in CI.
- **Mobile seams** (from the tooling-ci-cd spec): the `garmin` domain rules are unit-tested (suggestion on the same local day, no suggestion on a rest day, one Activity per Session, Unplanned Activities in dashboard stats). Screens are integration-tested with the repository and the BFF client mocked. A Maestro flow imports Activities from a BFF stub and links one to a Session.
- **Never in CI:** a real Garmin call or a real Personal API Key.

## Out of Scope

- Sending Workouts to a Garmin device or calendar (the Personal API is read-only).
- More than one Garmin user, and Garmin's business Developer Program (ADR 0007).
- Laps, splits, heart-rate streams, FIT files and wellness data (sleep, HRV, Body Battery).
- Scheduled server-side sync and push notifications.
- A BFF database, a staging environment, and BFF versioning with changesets.
- Server-side storage of Plans, Workouts or Sessions (ADR 0005).
- A real authentication backend; the BFF access token stands in until one exists.
- Creating Fly, Garmin, Expo or GitHub accounts, keys or tokens.

## Further Notes

- This spec's issue 01 (the monorepo move) lands before tooling-ci-cd issue 01, whose PR workflow is written against the monorepo. All tooling-ci-cd paths are relative to `apps/mobile` from then on.
- AGENTS.md rules still apply inside `apps/mobile`: install Expo dependencies with `expo install` (run through pnpm in the mobile workspace) and check the SDK 58 docs before touching any Expo or EAS API.
- ADRs: 0004 (pnpm + Turborepo monorepo), 0005 (the BFF is an import source), 0006 (shared contracts, not shared domain), 0007 (single-user Garmin Personal API).
