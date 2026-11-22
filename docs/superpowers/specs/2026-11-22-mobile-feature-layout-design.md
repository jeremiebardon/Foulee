# Mobile feature layout and swappable services

Date: 2026-11-22. Scope: `apps/mobile` only.

## Why

Feature folders in `apps/mobile/src/features/` are flat: domain, repositories, clients, hooks, components and screens sit side by side, and only a file-name suffix says which is which (`garmin/` has 15 files at its root). The owner finds this hard to navigate and wants the folder to say what a file is.

They also don't want features tied to one library for outside services. Today `bff.client.ts` calls `fetch` itself and the BFF token code calls `expo-secure-store` itself, so moving to another HTTP library or storage module would mean editing feature code.

## Goals

- Each feature is split into role folders, so where a file lives and where a new one goes is obvious.
- Outside services (HTTP, secure storage, key-value storage) are reached through an interface with one adapter per library. Swapping the library means writing a new adapter and changing one line where it's wired.
- Lint enforces the new layout as strictly as it enforces the flat one today.

## Non-goals

- No behaviour change: same screens, same data, same routes in `src/app/`.
- No new dependencies.
- No change to `apps/bff` or `packages/`.
- No generic database service. Each feature's repository stays the database seam (see Decisions).
- No move of `SettingsScreen` out of `garmin`, and no other feature-boundary redesign.

## Anti-goals (a failure even if it works)

- Any lint rule loosened: domain purity, one-way feature dependencies, entry-point-only imports, shared code importing no feature.
- Mobile coverage dropping below 100%, or new coverage exclusions beyond the ones listed here.
- Live queries broken: screens must still re-render when the database changes.
- Tests checking less than they do today. Tests move and their imports change. The behaviour they check stays; only checks tied to a library's mechanics (the exact `fetch` call) move to that library's adapter tests.

## Constraints

- AGENTS.md: tests live in a `__tests__` folder next to the code they test; pnpm only; run lint, typecheck and test through Turbo before calling it done.
- ADR 0003: repository modules, `src/db` and `src/app` are the only coverage exclusions, and the repository modules are the one mock seam of screen tests.
- `eslint.config.js` (#15) and its self-tests in `apps/mobile/__tests__/lint-*.test.js` encode the flat layout and must be rewritten alongside it.
- The Garmin feature exists only on PR #24. This work starts after #24 merges into `main`.

## Approaches considered

1. **By role** (picked): `domain/`, `data/`, `hooks/`, `components/`, `screens/` inside each feature. Familiar from most React Native apps, and each folder maps onto a lint rule that already exists as a suffix rule.
2. **Mirror the BFF layers** (`domain/`, `application/`, `infrastructure/`, `ui/`). Same vocabulary as `apps/bff`, but in a local-first app most use cases would only pass calls through, and it's heavy for `workouts` (7 files).
3. **By file type only** (`api/`, `components/`, `screens/`, `hooks/`, `utils/`). Simplest, but domain code lands in `utils/` and loses its purity rule.

The owner picked 1.

## Design

### Feature layout

```
src/features/<feature>/
├── domain/       pure TypeScript: types, rules; index.ts is the pure entry point
├── data/         reads and writes: *.repository.ts (database), *.api.ts (BFF), stores
├── hooks/        use*.ts: React hooks composing data and domain, no JSX
├── components/   .tsx used by screens, and by other features through index.ts
├── screens/      .tsx, one per route
└── index.ts      public entry point (screens, components, hooks other features need)
```

A feature creates only the folders it needs. Tests sit in a `__tests__` folder inside each role folder, for example `features/garmin/domain/__tests__/link.test.ts`.

`@/features/<f>/domain` now resolves to `domain/index.ts`, which replaces today's `domain.ts`. Import paths used by other features and by routes don't change.

### Where today's files go

| Feature | domain/ | data/ | hooks/ | components/ | screens/ |
|---|---|---|---|---|---|
| workouts | workout.ts | workout.repository.ts | | WorkoutSummary | WorkoutDetail, WorkoutEditor, WorkoutList |
| plans | plan.ts | plan.repository.ts | | PlanPicker, SessionRow | PlanDetail, PlanEditor, PlanList |
| garmin | activity.ts, link.ts, bffAccess.ts | activity.repository.ts, bff.client.ts → bff.api.ts, bffAccess.client.ts → bffAccess.store.ts | useLinking.ts, plus any hook now living in a `.client.ts` or `.tsx` file | ActivityCard, GarminImportLink | ActivityImportScreen, SettingsScreen |
| calendar | | | | LogRunSheet | CalendarScreen |
| dashboard | stats.ts | none (the screen's `@/db/seed` import stays: `@/db` isn't a restricted import) | | | DashboardScreen |
| auth | auth.ts (holds the `AuthGateway` port) | gateway.ts (picks the build's gateway), mockAuthGateway.ts, session.store.ts (the `saveSession` kv write, moved out of AuthProvider) | | AuthProvider (context, provider and `useAuth`) | LoginScreen |

A hook that reads a context stays in the component file that owns the context (`useAuth`). `hooks/` holds hooks that compose data and domain.

### Lint rules (replace the suffix rules in `eslint.config.js`)

- **Within a feature, folders depend in one direction:** domain ← data ← hooks ← components ← screens. A file imports only its own folder and the folders before it. `index.ts` may import any of them.
- **`domain/` stays pure:** the same rule plain `.ts` files have today (no React, React Native, Expo module, Drizzle or `@/db`, no `fetch`). Other features' domain code is reached only through `@/features/<f>/domain`.
- **No relative import leaves the feature**, whatever the depth (`screens/X.tsx`, `domain/__tests__/x.test.ts`). Imports across folders inside a feature stay relative.
- Kept as they are: one-way feature dependencies (`FEATURE_DEPS`), entry-point-only imports from outside, shared code importing no feature, environment only through `appConfig()`, no coverage-ignore comments.
- **Service libraries are imported only by their adapter** in `src/shared/services/`. The rule covers exactly `expo-secure-store`, `expo-sqlite/kv-store` and the `fetch`/`XMLHttpRequest` globals. Drizzle, `expo-sqlite` and `@/db` aren't part of it (the database seam is the repository, see Database). Exempt: `src/e2e`, `src/devtools`, test code.
- The self-tests in `apps/mobile/__tests__/lint-*.test.js` are updated to prove each rule with an allowed and a forbidden import.

### Shared services

```
src/shared/services/
├── http/          HttpClient.ts (interface), fetchHttpClient.ts (adapter)
├── secureStore/   SecureStore.ts (interface), expoSecureStore.ts (adapter)
├── kvStore/       KvStore.ts (interface), expoKvStore.ts (adapter)
└── index.ts       composition root: export const services = { http, secureStore, kvStore }
```

- **HttpClient** has a small request/response shape of its own: no `fetch` `Response` type leaks into features. A network failure and a timeout surface as one typed error. The 20-second timeout moves from `bff.client.ts` into the call (an option on the request); the adapter implements it.
- **Features use `services.http` etc.** from `@/shared/services`. To swap a library, write a new adapter and change its line in `index.ts`.
- **Interfaces have their own shape**, not the expo method names (`get`, `set`, `delete`, not `getItemSync`/`deleteItemAsync`). The secure and key-value stores stay synchronous where they are today: `useSyncExternalStore` and AuthProvider's first-render read depend on it.
- **Feature tests use fake services:** an in-memory fake per interface in `src/test/`, wired with `jest.mock('@/shared/services', …)`, the same module-mock style the repo uses today. Test helpers that drive the store (`setItem`, `failNextWrite`, `clearSync`) get equivalents on the fakes.
- **Adapter tests stay on the libraries:** `fetchHttpClient` is tested against a stubbed global `fetch`, including the exact request and the timeout abort; the expo adapters are tested with today's `memorySecureStore` / `memoryKvStore` module mocks. All stay inside coverage.
- **The BFF api tests use a fake `HttpClient`:** they check the request `bff.api.ts` builds (URL, headers, a 20-second timeout) and how it maps responses and failures. The timeout itself is proven once, in the adapter tests.
- **The e2e BFF stub stays a patch of global `fetch`** (`src/e2e/bffStub.ts`), so `fetchHttpClient` must read `globalThis.fetch` on every call, never once at import. The startup test is unchanged.

### Database

`src/db` (schema, migrations, Drizzle client) stays where it is. Each feature's `data/*.repository.ts` is the database adapter: screens and hooks call its functions and never touch Drizzle. Replacing Drizzle means rewriting the repository files and `src/db`, not features. A generic database service is out because Drizzle's `useLiveQuery` is what makes screens re-render on change, and a generic interface would have to rebuild that.

The coverage exclusion becomes `src/features/*/data/*.repository.ts`, the same set of files as today.

### Docs

- New ADR 0008, "Mobile feature layout by role", superseding the flat layout from #15, with the folder order and the services rule. ADR 0003 gets a line pointing at the new repository path.
- AGENTS.md: the Tests section example path, and a short Mobile layout section pointing at ADR 0008.
- The comment block at the top of `eslint.config.js` describes the new rules.

## Decided by Claude (owner can override)

- **Services are wired through a module (`services` in `src/shared/services/index.ts`), not a React provider.** This changes what I first suggested. A module matches how tests already fake modules with `jest.mock`, and it needs no provider in every screen test. Swapping a library is still one line.
- **Repositories aren't injected.** They stay module functions mocked through `src/test/fakeRepositories.ts`, so ADR 0003's single mock seam is unchanged.
- **The folder order is enforced by lint**, not just a convention.
- **`src/db` stays put**, to avoid churn in `drizzle.config.ts` and the migrations path.
- **Files are renamed only where the old suffix carried meaning the folder now carries.** `*.client.ts` becomes `*.api.ts` or `*.store.ts`; `*.repository.ts` stays because coverage keys on it.
- **Tests for the BFF api check the request it builds, not the `fetch` call.** Checks tied to `fetch` move to the adapter's tests, so a library swap doesn't touch feature tests.
- **Auth:** `gateway.ts` goes in `data/`, because it chooses an implementation. The kv write moves out of `AuthProvider` into `data/session.store.ts`. `useAuth` stays next to its context.
- **The e2e stub keeps patching `fetch`** rather than becoming a stub adapter, so the startup test doesn't change.
- **Lint and the moves land in one commit**, because a half-moved tree would otherwise lose the domain purity check for a while.

## Left to the builder

- The exact `HttpClient` method signatures and error type name.
- How the "no relative import leaves the feature" rule is written (a regex per depth, or a small custom rule like the existing coverage plugin).
- Whether `kit.tsx` in `src/shared/ui` is split. It's not required.

## Delivery

One GitHub issue on `jeremiebardon/Foulee` for this design, and one branch from `main` after PR #24 merges: `refactor/25-mobile-feature-layout`. `pnpm turbo run lint typecheck test` passes at every commit (docs/agents/branching.md). Today's lint rules can't accept a half-moved tree without losing the domain purity check, so the commits are:

1. The new lint rules and their self-tests, plus every feature moved, in one commit. It's mechanical, and git shows the moves as renames.
2. Shared services, their adapters and fakes, and features switched to them.
3. ADR 0008, the ADR 0003 line, AGENTS.md and the `eslint.config.js` comment.

This design doc is committed on that branch.
