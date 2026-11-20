# 02: Remove the web target

**What to build:** The app is native-only (ADR 0002). The web dependencies, the web section of the app config, the web start script and web-only code paths and comments (such as the async web SQLite worker note) are gone. The app still starts on iOS and Android, and CI stays green.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] No web-only dependencies remain in the package manifest
- [ ] No web config or web script remains
- [ ] No code or comment refers to running on web
- [ ] Lint, typecheck and tests pass in CI
