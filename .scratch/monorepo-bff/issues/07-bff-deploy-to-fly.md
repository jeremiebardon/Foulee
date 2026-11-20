# 07: Deploy the BFF to Fly.io from `main`

**What to build:** The BFF runs in production on Fly.io and redeploys itself when it changes. A Dockerfile builds from `turbo prune bff --docker` output into a small Node runtime image. `fly.toml` defines the app with one small machine and a health check. A GitHub workflow on push to `main` runs only when the BFF is affected, tags the image with the git SHA and runs `fly deploy`. The production app variant's `EXPO_PUBLIC_BFF_URL` points at the Fly URL. The release guide gains a BFF section: creating the Fly app, `fly secrets set GARMIN_PERSONAL_API_KEY BFF_ACCESS_TOKEN`, the `FLY_API_TOKEN` GitHub secret, creating and rotating the Personal API Key, and what `garmin_access_expired` means.

**Blocked by:** 03, tooling-ci-cd/01

**Status:** ready-for-agent

- [ ] The image builds locally from the pruned output and starts with the two secrets set
- [ ] An app-only change on `main` does not deploy the BFF; a BFF or contracts change does
- [ ] The running BFF reports the git SHA it was built from (health endpoint or response header)
- [ ] GitHub holds only `FLY_API_TOKEN` for this; Garmin and BFF secrets live in Fly
- [ ] The release guide lists every manual step; the agent creates no account, app or secret itself
