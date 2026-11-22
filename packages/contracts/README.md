# @foulee/contracts

zod schemas for the HTTP API between the app (`apps/mobile`) and the BFF (`apps/bff`), with the TypeScript types inferred from them (ADR 0006). The BFF validates what it sends against them and the app parses what it receives with them. API contracts only: no domain types, no Garmin shapes.

## The rule: additive-only inside `/v1`

An app build already installed on a phone keeps the schemas it was built with, and the BFF deploys on its own. So every change inside `/v1` must keep that older build working. Which changes do depends on the way a schema travels:

- A **request** (a query string, a request body) is sent by the installed app and parsed by a newer BFF, so the BFF may only accept more.
- A **response** (a response body, an error body) is sent by a newer BFF and parsed by the installed app, so the BFF may only send less. The app parses with `z.object`, which strips unknown keys, so a new field is safe; anything else that widens what the BFF sends is not.

| Change                                                         | Request             | Response            |
| -------------------------------------------------------------- | ------------------- | ------------------- |
| a new endpoint                                                 | allowed             | allowed             |
| a new optional field                                           | allowed             | allowed             |
| a new required field                                           | fails               | allowed             |
| removing or renaming a field, or an endpoint                   | fails               | fails               |
| an optional field made required                                | fails               | allowed             |
| a required field made optional                                 | allowed             | fails               |
| a field made nullable, or a type widened (integer to number)   | allowed             | fails               |
| `nullable` removed, or a type narrowed                         | fails               | allowed             |
| a new enum value                                               | allowed             | fails               |
| a removed enum value                                           | fails               | allowed             |
| a bound or length loosened, or a format removed                | allowed             | fails               |
| a bound or length tightened, or a new format                   | fails               | allowed             |
| a changed pattern, or a field added to a `z.strictObject`      | fails               | fails               |
| a schema moved from one direction to the other                 | fails               | fails               |

"Allowed" means the check lets it through, not that it is free: a response field made required, for example, is still a promise the BFF keeps from then on.

A change that cannot follow the rule belongs in a new `/v2`, served next to `/v1` until no installed build uses it.

## The check in CI

`json-schema/v1.json` is the v1 contract exported to JSON Schema: every schema in `src/compat/v1.ts` (`v1Contract`), keyed by where it travels, with its direction (`request` or `response`). When a pull request affects this package, the `check` job of `.github/workflows/pr-checks.yml` compares the current schemas with the `json-schema/v1.json` committed on `main` and fails on any change the table above marks as failing for that schema's direction. JSON Schema keywords the check does not model (`additionalProperties`, `allOf`, …) fail whenever they change, so review those by hand.

After changing a schema:

```bash
pnpm --filter @foulee/contracts export:json-schema   # rewrite json-schema/v1.json, then commit it
pnpm --filter @foulee/contracts check:compat --base origin/main   # needs dist/: run after the line above
```

The package's tests fail while `json-schema/v1.json` is out of date, and while a schema exported from `src/index.ts` is missing from `v1Contract`: register a new endpoint there, with the direction it travels in. The unversioned `GET /health` is registered too: Fly reads it, and its shape is an API contract like the others.

The check reads every schema as the input `parse` accepts (`io: 'input'`), which is what both sides of the wire check.
