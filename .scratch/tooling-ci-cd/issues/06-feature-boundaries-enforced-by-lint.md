# 06: Feature boundaries enforced by lint

**What to build:** The existing flat feature layout is formalized, not restructured. Each feature exposes a public entry point, and ESLint fails when a feature deep-imports another feature's internals, when a domain file imports React, React Native or the database, when the dependency direction (workouts ← plans ← calendar, dashboard) is broken, or when shared code imports a feature. Existing violations are fixed.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] Each feature has a public entry point, and cross-feature imports go through it
- [ ] Lint fails on a deliberate deep import, an impure domain import and a reversed dependency (checked, then reverted)
- [ ] Route files keep re-exporting screens and pass lint
- [ ] `expo lint` passes in CI
