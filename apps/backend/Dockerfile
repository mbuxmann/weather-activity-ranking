# syntax=docker/dockerfile:1.7

# ---------- Builder ----------
FROM oven/bun:1.3.3-alpine AS builder
WORKDIR /app

# Workspace manifests first so install is cached when sources change
COPY package.json bun.lock turbo.json tsconfig.base.json ./
COPY apps/backend/package.json apps/backend/
COPY apps/frontend/package.json apps/frontend/
COPY packages/contracts/package.json packages/contracts/

RUN bun install --frozen-lockfile

# Sources
COPY packages/contracts packages/contracts
COPY apps/backend apps/backend

# Generate contracts types, then build contracts and backend
RUN bun run --filter contracts generate \
 && bun run --filter contracts build \
 && bun run --filter backend build

# ---------- Runtime ----------
FROM oven/bun:1.3.3-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    PORT=4000

# Bring over package manifests and built artifacts before installing
# so bun can resolve the `contracts` workspace symlink correctly.
COPY --from=builder /app/package.json /app/bun.lock ./
COPY --from=builder /app/apps/backend/package.json apps/backend/
COPY --from=builder /app/apps/frontend/package.json apps/frontend/
COPY --from=builder /app/apps/backend/dist apps/backend/dist
COPY --from=builder /app/packages/contracts/package.json packages/contracts/
COPY --from=builder /app/packages/contracts/dist packages/contracts/dist

# Production-only install (skips devDependencies, keeps workspace symlinks)
RUN bun install --frozen-lockfile --production \
 && rm -rf /root/.bun/install/cache

# Drop privileges
USER bun

EXPOSE 4000
WORKDIR /app/apps/backend
CMD ["bun", "run", "dist/index.js"]
