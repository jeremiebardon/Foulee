# Branching

Trunk-based: `main` is always releasable, and all work happens on short-lived branches merged through pull requests.

## Rules

- **Never commit or push directly to `main`.** It is protected (see `docs/release-guide.md`); the `check` job must pass before merge.
- **One branch per issue** (a GitHub issue, `#<n>`). Keep it small and short-lived: merge within days, not weeks.
- **Branch from an up-to-date `main`.** Rebase on `main` rather than merging `main` into the branch.
- **Naming:** `<type>/<NN>-<slug>`, lowercase, hyphenated, where `<type>` is one of `feat`, `fix`, `chore`, `ci`, `docs`, `refactor`, `test`, and `<NN>` is the GitHub issue number (for example `ci/10-baseline-pr-checks`).
- **Commits:** Conventional Commits (`type(scope): summary`), each commit passing lint, typecheck and tests.
- **Merge:** squash merge, so `main` keeps one commit per PR. The PR title becomes the commit subject, in Conventional Commit form.
- **After merge:** delete the branch (GitHub's "automatically delete head branches" setting is on).
- **No force-push to `main`.** Force-pushing your own feature branch is fine.

## Step for implementing an issue

1. `git switch main && git pull --ff-only`
2. `git switch -c <type>/<NN>-<slug>`
3. Implement, commit, run `pnpm turbo run lint typecheck test`.
4. Push the branch and open a PR to `main` whose body says `Closes #<n>`; wait for `check` to pass.
5. Squash merge, delete the branch.
