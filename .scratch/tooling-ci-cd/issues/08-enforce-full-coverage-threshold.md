# 08: Enforce the 100% coverage threshold

**What to build:** CI fails if feature or shared code drops below 100% coverage. The Jest config sets 100% thresholds for lines, branches, functions and statements, and lists the exclusions in one place (repository modules, the database layer, route files) with a comment pointing to ADR 0003. Inline coverage-ignore comments are rejected by lint or a CI check.

**Blocked by:** 07

**Status:** ready-for-agent

- [ ] Thresholds and exclusions live only in the Jest config, with a pointer to ADR 0003
- [ ] Removing a test makes CI fail (checked, then reverted)
- [ ] An inline coverage-ignore comment makes CI fail (checked, then reverted)
