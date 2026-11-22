# syntax=docker/dockerfile:1

# The BFF's production image. The build context is the output of `turbo prune`, not the repository:
#
#   pnpm turbo prune bff --docker          # writes out/json, out/full and the pruned lockfile
#   docker build -f apps/bff/Dockerfile --build-arg GIT_SHA="$(git rev-parse HEAD)" out
#
# out/json holds only the package manifests and the pruned lockfile, so the install layer below
# stays cached until a dependency changes. out/full holds the sources of the BFF and the workspace
# packages it depends on, nothing of the mobile app. .github/workflows/deploy-bff.yml does the same
# on Fly's builder.

FROM node:24-alpine AS base
# pnpm comes from the root package.json's "packageManager" field, through Corepack (bundled with Node 24).
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable
WORKDIR /repo

FROM base AS build
COPY json/ .
RUN --mount=type=cache,id=pnpm,target=/var/cache/pnpm \
    pnpm install --frozen-lockfile --store-dir /var/cache/pnpm
COPY full/ .
# Builds @foulee/contracts first (turbo.json: build dependsOn ^build), then the BFF.
RUN pnpm turbo run build --filter=bff
# A standalone copy of the BFF: its "files" (dist), and only its production dependencies, with
# @foulee/contracts copied in as a regular dependency.
RUN --mount=type=cache,id=pnpm,target=/var/cache/pnpm \
    pnpm --filter=bff deploy --prod --store-dir /var/cache/pnpm /prod/bff

FROM node:24-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /prod/bff .
USER node
# Matches internal_port in fly.toml. GARMIN_PERSONAL_API_KEY and BFF_ACCESS_TOKEN come from the
# environment (Fly secrets), never from the image: the BFF refuses to boot without them.
ENV PORT=3000
EXPOSE 3000
# Last, so a new commit only rebuilds this layer. GET /health reports it.
ARG GIT_SHA=""
ENV GIT_SHA=$GIT_SHA
CMD ["node", "dist/main.js"]
