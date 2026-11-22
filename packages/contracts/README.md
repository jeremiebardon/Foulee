# @foulee/contracts

zod schemas for the HTTP API between the app (`apps/mobile`) and the BFF (`apps/bff`), with the TypeScript types inferred from them (ADR 0006). The BFF validates what it sends against them and the app parses what it receives with them. API contracts only: no domain types, no Garmin shapes.

## The rule: additive-only inside `/v1`

An app build already installed on a phone keeps the schemas it was built with, and the BFF deploys on its own. So every change inside `/v1` must keep that older build working:

| Allowed                      | Not allowed (CI fails)                                          |
| ---------------------------- | --------------------------------------------------------------- |
| a new optional field         | removing or renaming a field                                    |
| a new endpoint               | removing or renaming an endpoint                                |
| a new enum value (see below) | making an optional field required, or adding a required field   |
| loosening a type or a bound  | narrowing a type: a removed enum value, a new or tighter bound, `nullable` removed, a changed type, pattern or format |

A change that cannot follow the rule belongs in a new `/v2`, served next to `/v1` until no installed build uses it.

## The check in CI

`json-schema/v1.json` is the v1 contract exported to JSON Schema: every schema in `src/compat/v1.ts` (`v1Contract`), keyed by where it travels. When a pull request affects this package, the `check` job of `.github/workflows/pr-checks.yml` compares the current schemas with the `json-schema/v1.json` committed on `main` and fails on any change in the right-hand column above. JSON Schema keywords the check does not model (`additionalProperties`, `allOf`, …) fail whenever they change, so review those by hand.

After changing a schema:

```bash
pnpm --filter @foulee/contracts export:json-schema   # rewrite json-schema/v1.json, then commit it
pnpm --filter @foulee/contracts check:compat --base origin/main   # needs dist/: run after the line above
```

The package's tests fail while `json-schema/v1.json` is out of date, and while a schema exported from `src/index.ts` is missing from `v1Contract`: register a new endpoint there.

The check reads every schema as the input `parse` accepts, in both directions. It catches what an older app build would send that a new BFF would reject. It does not catch a response that gets wider (a new enum value, a field that becomes nullable or optional), which an older build parsing strictly can still reject, so treat those with care.
