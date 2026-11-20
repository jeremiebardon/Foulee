# Release guide

This guide grows with the tooling-ci-cd work (`.scratch/tooling-ci-cd/`). Today it covers the one-time GitHub setup. Agents never create the remote repository, accounts or tokens; you do these steps yourself.

## One-time GitHub setup

1. **Create the repository** on GitHub (empty: no README, license or `.gitignore`). Keep it private or public as you prefer.
2. **Add the remote and push `main`** from the repo root:

   ```bash
   git remote add origin git@github.com:<you>/foulee.git
   git push -u origin main
   ```

3. **Open a first pull request** so the `PR checks` workflow runs once and its `check` job appears in GitHub's list of checks.
4. **Protect `main`** (Settings → Branches → Add branch ruleset / protection rule for `main`):
   - Require a pull request before merging.
   - Require status checks to pass, and select **`check`**. It is one job that always runs, so it never blocks a merge by being skipped.
   - Require branches to be up to date before merging.
   - Block force pushes and deletion of `main`; allow squash merging only.
   - Under Settings → General, enable "Automatically delete head branches".

Branch naming and commit rules are in `docs/agents/branching.md`.
5. **Enable the Turborepo remote cache** (optional but recommended; CI works without it):
   - Create a Vercel team token (or your remote-cache provider's) and add it as the repository **secret** `TURBO_TOKEN`.
   - Add the team slug as the repository **variable** `TURBO_TEAM`.

## What the PR check does

`.github/workflows/pr-checks.yml` runs on every pull request and every push to `main`:

1. Installs with `pnpm install --frozen-lockfile` (pnpm store cached).
2. Asks Turbo which projects are affected relative to the base branch (`turbo ls --affected`).
3. Runs `expo-doctor` in `apps/mobile` only when `mobile` is affected.
4. Runs `turbo run lint typecheck test --affected`.

A change to `apps/bff` alone skips the mobile tasks. A change to `packages/contracts` affects both apps, so both run.
