# 07: Integration tests for all features and shared UI

**What to build:** Following the pattern from ticket 03, every screen and non-trivial component is covered by integration tests that render real UI with only repository modules mocked: workouts (list, editor, detail, summary), plans (list, editor, detail, plan picker, session row), calendar (month view, log-run sheet), dashboard, auth (login screen with the mock gateway, auth provider) and the shared UI kit. Feature and shared code (excluding repositories, the database layer and route files) reaches 100% coverage.

**Blocked by:** 03, 04

**Status:** ready-for-agent

- [ ] Tests assert only on what the user sees (text, roles) and does (press, type), never on internals
- [ ] Writes are verified through the mocked repository functions they call
- [ ] The coverage report shows 100% lines, branches, functions and statements on the in-scope code
- [ ] No inline coverage-ignore comments
