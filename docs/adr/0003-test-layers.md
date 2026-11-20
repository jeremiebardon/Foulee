# Test layers: Jest stays free of native code, Maestro owns the database

Repositories read through Drizzle's `useLiveQuery`, which relies on expo-sqlite's native change listener and cannot run under Jest. Rather than shim it with `better-sqlite3`, Jest (`jest-expo` + React Native Testing Library) covers pure domain code (unit) and screens with their repository mocked (integration). Maestro, running against a real build, is the only layer that touches SQLite and repositories.

## Considered Options

- `better-sqlite3` + real migrations + a home-made `useLiveQuery` shim: rejected, because it would test our shim rather than the real reactive path, and the shim is ours to maintain.
- Vitest for domain and Jest for components: rejected in favour of a single runner.

## Consequences

- Jest enforces a 100% coverage threshold (lines, branches, functions, statements) on feature and shared code, excluding repository modules, the database layer and the route files, which only re-export screens. These exclusions sit in one place, the Jest config. Inline `istanbul ignore` comments are not allowed.
- Anything excluded from coverage must be exercised by a Maestro flow.
