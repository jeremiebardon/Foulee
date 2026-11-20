# 06: Contract compatibility check in CI

**What to build:** CI blocks a contract change that would break an app build already on a phone. When `packages/contracts` is affected, a step exports the v1 schemas to JSON Schema, compares them with the version on `main` and fails on removed or renamed fields, newly required fields, or narrowed types. Adding optional fields or new endpoints passes. The rule (additive-only inside `/v1`) is stated in the contracts package README.

**Blocked by:** 02, tooling-ci-cd/01

**Status:** ready-for-agent

- [ ] Removing a field, making an optional field required and narrowing an enum each fail the check (checked on a branch, then reverted)
- [ ] Adding an optional field passes
- [ ] The step runs only when `packages/contracts` is affected
