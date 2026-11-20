# Mobile and BFF share API contracts as zod schemas, never domain models

`packages/contracts` holds zod schemas for the HTTP API between the app and the BFF, with TypeScript types inferred from them. The BFF validates its inputs and outputs against them and the app parses responses with them, so a mismatch fails loudly at the boundary. Domain models are deliberately not shared: the mobile `Workout` aggregate and the BFF's Activity model are separate bounded contexts that only meet through these contracts.

## Considered Options

- Plain TypeScript types: rejected, no runtime check on data crossing the network.
- OpenAPI generated from Nest decorators plus a generated client: rejected, adds a codegen step and makes the BFF's framework the source of truth for the contract.
- A shared domain package: rejected, it would couple both apps' internals and leak Garmin shapes into the mobile domain.
