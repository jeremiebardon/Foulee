# Test layers: Jest stays free of native code, Maestro owns the database

Repositories read through Drizzle's `useLiveQuery`, which relies on expo-sqlite's native change listener and cannot run under Jest. Rather than shim it with `better-sqlite3`, Jest (`jest-expo` + React Native Testing Library) covers pure domain code (unit) and screens with their repository mocked (integration). Maestro, running against a real build, is the only layer that touches SQLite and repositories.

## Considered Options

- `better-sqlite3` + real migrations + a home-made `useLiveQuery` shim: rejected, because it would test our shim rather than the real reactive path, and the shim is ours to maintain.
- Vitest for domain and Jest for components: rejected in favour of a single runner.

## Consequences

- Jest enforces a 100% coverage threshold (lines, branches, functions, statements) on feature and shared code, excluding repository modules, the database layer and the route files, which only re-export screens. These exclusions sit in one place, the Jest config. Inline `istanbul ignore` comments are not allowed.
- Anything excluded from coverage must be exercised by a Maestro flow.

## Addendum (spec #9): exclusions that no Maestro flow reaches

The Jest config excludes two more folders. Neither ships in the app, so the Maestro rule above does not apply to them:

- `src/devtools`: the development-only wiring of Rozenite and Drizzle Studio. The root layout requires it behind `__DEV__`, so Metro drops it from every release bundle, e2e builds included. That is also why no Maestro flow can reach it. It holds no logic of its own; a Jest test could only check that mocked hooks were called.
- `src/test` (and `*.test.*` files): fakes, fixtures and helpers. They are test code, not app code, and run in every test that uses them.

Route files stay excluded on one condition: they only compose. A route re-exports a screen or forwards a call, and a layout wires navigators and providers; Maestro exercises both. Any decision of their own moves into a covered module. For example, the incoming-link redirect lives in `src/e2e/link.ts`, and `src/app/+native-intent.tsx` only calls it.

Some checks are not Jest tests and have no coverage threshold. They run with `node --test`:

- `apps/mobile/scripts/check-*.js`, run by `pnpm lint`. These self-tests prove that the lint rules and the app config still do their job. They are tests themselves.
- `packages/release-tools`, run by its `test` task. It is CI tooling (the changeset check and the release tag), not app code, and its pure modules are unit-tested there.
