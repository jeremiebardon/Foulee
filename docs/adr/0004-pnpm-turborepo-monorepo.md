# pnpm + Turborepo monorepo: mobile app, BFF and shared contracts

The repository holds `apps/mobile` (the Expo app, moved from the root), `apps/bff` (NestJS) and `packages/contracts`, plus shared config packages. pnpm's isolated `node_modules` stop one app from silently using another's dependencies, and Turborepo's task graph decides what to lint, typecheck, test and deploy, so a change to `packages/contracts` re-checks both apps while a change to one app leaves the other alone.

## Considered Options

- npm workspaces (the app already used npm): rejected, because hoisting lets the BFF resolve React Native packages by accident and `turbo prune` works best with pnpm.
- Per-app GitHub workflows with `paths:` filters: rejected, because skipped required checks block merges and every filter must list `packages/contracts` by hand. One PR workflow runs `turbo run … --affected`; only deploy/release workflows are per app.

## Consequences

- `package-lock.json` is replaced by `pnpm-lock.yaml`; the tooling-ci-cd spec's "npm cache" and root-level paths now refer to pnpm and `apps/mobile`.
