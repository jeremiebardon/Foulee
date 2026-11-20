# Foulée (Expo)

Running training plans, offline-first: structured workouts, multi-week plans, a calendar and a dashboard. Expo SDK 58, Expo Router, expo-sqlite + Drizzle ORM.

A pnpm + Turborepo monorepo: the app is in `apps/mobile`, shared config in `packages/` (see ADR 0004).

```bash
pnpm install
pnpm turbo run lint typecheck test   # every project (add --affected for only what changed)
cd apps/mobile
pnpm start              # press i / a; Expo Go works (expo-sqlite is included)
pnpm db:generate        # after editing src/db/schema.ts
```

Paths below are relative to `apps/mobile`.

The first launch offers **Charger un exemple** to load a 10-week plan. Sign-in is a mock: the 6-digit code is shown on screen instead of emailed.

## Structure

```
src/
  app/                    Routes only (Expo Router). Each file re-exports a feature screen.
  db/                     Drizzle schema, client, generated migrations, demo seed
  features/
    auth/                 Port (AuthGateway), mock adapter, provider, login screen
    workouts/             Workout aggregate (steps + repeats), repository, list/editor
    plans/                Plan + sessions, repository, list/editor, plan picker
    calendar/             Month view, log-a-run sheet
    dashboard/            Stats (pure) + screen
  shared/
    lib/                  Dates, formatting/parsing, ids
    ui/                   Theme + UI kit (Button, Field, Chips, Sheet, Stepper…)
```

Each feature keeps three layers in flat files:

| File | Layer | Depends on |
| --- | --- | --- |
| `workout.ts`, `plan.ts`, `stats.ts` | Domain: types and pure rules, unit-tested | nothing (no React, no DB) |
| `*.repository.ts` | Data: live-query hooks for reads, functions for writes | domain, `db` |
| `*Screen.tsx` | UI | repository, domain, `shared/ui` |

Dependencies flow one way: `workouts ← plans ← calendar, dashboard`.

## Navigation

| Route | Screen |
| --- | --- |
| `/workouts`, `/workouts/new` | List, create |
| `/workouts/[id]`, `/workouts/[id]/edit` | Detail (steps as run), edit |
| `/plans` | List (« Nouveau plan » opens the editor directly) |
| `/plans/[id]`, `/plans/[id]/edit` | Detail (every week, tap a session to open its workout), edit |

Any workout card (list, calendar, dashboard) opens its detail. Deleting from an editor returns to the list.

## Offline-first

SQLite on the device is the source of truth. Screens read through Drizzle's `useLiveQuery`, so any write re-renders every screen that shows the changed table. There is no loading or network state to manage.

- `useLiveQuery` watches only a query's main table, so reads stay one table per query and `toSessionViews()` joins them in memory.
- Deleting a plan or a workout cascades to its sessions through foreign keys (`PRAGMA foreign_keys = ON`).
- IDs are UUIDs, so rows created offline on two devices won't collide if a sync is added.

## Next steps for production

- **Auth**: write an `AuthGateway` adapter for a real OTP service and swap it in `src/app/_layout.tsx`. Move the session from `expo-sqlite/kv-store` to `expo-secure-store` once it holds a real token.
- **Sync**: add `updatedAt` and a soft-delete column, then push/pull per table, or plug a sync engine (PowerSync, ElectricSQL) under the same repositories.
- **Web**: works, but needs `Cross-Origin-Embedder-Policy: credentialless` and `Cross-Origin-Opener-Policy: same-origin` headers in production (already set for dev in `metro.config.js` and for EAS Hosting in `app.json`).
