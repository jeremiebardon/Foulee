# Mobile features are split by role, and outside services sit behind interfaces

Each feature in `apps/mobile/src/features/` is split into role folders, in dependency order: `domain/` (pure types and rules, with its own pure `index.ts`), `data/` (everything that reaches outside the app: `*.repository.ts` for the database, `*.api.ts` for the BFF, `*.store.ts` for the phone's storage), `hooks/` (React hooks over data, no JSX), `components/` and `screens/`. A file imports its own folder and the folders before it, never a later one; only the feature's `index.ts`, its public entry point, may import any of them. A feature creates only the folders it needs. This replaces the flat layout of #15, where a file-name suffix was the only sign of what a file was.

HTTP, the secure store and the key-value store are reached through interfaces (`HttpClient`, `SecureStore`, `KvStore`), each with one adapter for the library behind it, in `src/shared/services/`. The adapters are wired in one object, `services`, exported by `src/shared/services/index.ts`. Features call `services.http` and the like and never import `fetch`, `expo-secure-store` or `expo-sqlite/kv-store`. Switching library means a new adapter and a change to one line of `index.ts`.

The database is not behind a service. A feature's `data/*.repository.ts` stays the seam: screens and hooks call its functions and never touch Drizzle. Replacing Drizzle means rewriting the repositories and `src/db`, not the features.

## Considered Options

- Mirror the BFF layers (`domain/`, `application/`, `infrastructure/`, `ui/`): rejected, because in a local-first app most use cases would only pass calls through, and four layers is heavy for a feature with seven files.
- Folders by file type only (`api/`, `components/`, `screens/`, `hooks/`, `utils/`): rejected, because domain code would land in `utils/` and lose its purity rule.
- A React provider for the services: rejected in favour of the `services` module. Tests already replace modules with `jest.mock`, and a module needs no provider around every screen test.
- A generic database service: rejected, because Drizzle's `useLiveQuery` is what re-renders screens when the database changes, and a generic interface would have to rebuild it. Injecting repositories is out for the same reason: they stay module functions, mocked in one place (ADR 0003).

## Consequences

- `apps/mobile/eslint.config.js` enforces the layout, and `apps/mobile/__tests__/lint-boundaries.test.js` prove each rule with an allowed and a forbidden import:
  - the folder order inside a feature, including through a later folder's `index.ts`, and no folder imports the feature's own entry point (`..`, `../index`), which re-exports every folder (a file outside the role folders is linted as a domain file until it is moved);
  - no relative import leaves the feature, at any depth;
  - `domain/` imports no React, React Native, Expo module, Drizzle, `@/db` or service, and calls no network;
  - only the adapters in `src/shared/services/` import `expo-secure-store` or `expo-sqlite/kv-store` (or a path inside them), or call `fetch` or `XMLHttpRequest`, including through `globalThis`, `window` or `self`. Features import the services and their types from `@/shared/services` only, never from the files behind it. `src/e2e`, `src/devtools` and test code are exempt.
- The one-way feature dependencies, the entry-point-only imports from outside a feature and `appConfig()` as the only reader of the environment are unchanged.
- The coverage exclusion for repositories narrows from `**/*.repository.ts` to `src/features/*/data/*.repository.ts`: the same files, now named by where they live (ADR 0003).
- Feature tests fake the services, with an in-memory fake per interface in `src/test/` wired through `jest.mock('@/shared/services', …)`. Only the adapters' tests know a library: `fetchHttpClient` is tested against a stubbed global `fetch`, and it reads `globalThis.fetch` on every call so the e2e BFF stub, which patches `fetch`, keeps working.
- The interfaces have their own method names, not the libraries', and the secure and key-value stores reads and writes stay synchronous (only `SecureStore.delete` is async), because `useSyncExternalStore` and the auth provider's first render read them synchronously.
