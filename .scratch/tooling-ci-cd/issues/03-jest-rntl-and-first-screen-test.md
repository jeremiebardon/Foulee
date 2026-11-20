# 03: Jest and React Native Testing Library replace Vitest, plus a first screen test

**What to build:** One test runner for unit and integration tests (ADR 0003). Vitest is removed and Jest with the `jest-expo` preset and React Native Testing Library runs the existing domain tests unchanged in intent. One screen, the workout list, gets an integration test that renders the real screen with the workouts repository module mocked, asserting only on what the user sees and does. This sets the pattern for every later screen test. CI runs Jest with coverage reporting (no threshold yet).

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] Vitest and its config are removed; Jest with `jest-expo` and RNTL are installed through `npx expo install`
- [ ] The `@` path alias resolves in tests
- [ ] The four existing domain test files pass under Jest, with tests kept next to their code
- [ ] The workout list screen test mocks only the repository module and asserts on visible text, roles and user actions
- [ ] CI runs Jest with coverage reporting
