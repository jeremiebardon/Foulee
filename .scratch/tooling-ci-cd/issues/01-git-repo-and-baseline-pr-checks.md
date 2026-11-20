# 01: Git repo and baseline PR checks

**What to build:** The project lives in a git repository on GitHub, and every pull request and every push to `main` runs a GitHub Actions job (Linux, pnpm cache) that runs `turbo run lint typecheck test --affected` across the monorepo, plus Expo's dependency health check in `apps/mobile` when mobile is affected. Turborepo remote cache is enabled in CI. A release guide is started with the GitHub-side manual steps (create the repository, add the remote, protect `main` and require the check, add the Turborepo remote cache token).

**Blocked by:** monorepo-bff/01

**Status:** ready-for-agent

- [ ] The folder is a git repository with a sensible `.gitignore` (the existing one is kept) and an initial commit
- [ ] A PR-check workflow runs on `pull_request` and on `push` to `main`: doctor (mobile only) → lint → typecheck → tests, through Turbo
- [ ] The workflow passes on the current code
- [ ] A PR touching only `apps/bff` skips the mobile tasks, and one touching `packages/contracts` runs both apps' tasks
- [ ] The check is a single always-running job, so requiring it in branch protection never blocks a merge
- [ ] The release guide lists the manual GitHub steps; the agent creates no remote repository or account itself
