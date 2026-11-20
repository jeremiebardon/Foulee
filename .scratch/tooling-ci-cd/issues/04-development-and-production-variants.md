# 04: Development and production variants

**What to build:** Two app variants that can be installed side by side. The static app config becomes a TypeScript app config built on a pure variant-resolution module (`development` | `production`, from `APP_VARIANT`). Production is `com.jbardon.foulee` and development is `com.jbardon.foulee.dev`, named "Foulée Dev", each with its own database file. Committed `.env.development` and `.env.production` hold only non-secret `EXPO_PUBLIC_*` values. Features read variant flags through one config accessor, never `process.env` directly. The mock sign-in and the "load demo plan" action exist only in development.

**Blocked by:** 02, 03

**Status:** ready-for-agent

- [ ] The variant-resolution module is pure and unit-tested for both variants (identity, name, scheme, database file name, dev flags)
- [ ] The app config sets the iOS bundle identifier and Android package per variant
- [ ] The database client opens the variant's database file
- [ ] The mock auth gateway and the demo seed are unavailable when the development flag is off
- [ ] `.env*.local` stays ignored, and no secret is committed
- [ ] Expo SDK 58 docs were checked for app config and env behaviour
