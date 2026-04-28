# syntax=docker/dockerfile:1.7

# ---------- Builder ----------
FROM oven/bun:1.3.3-alpine AS builder
WORKDIR /app

ARG VITE_GRAPHQL_URL=http://localhost:4000/graphql
ENV VITE_GRAPHQL_URL=$VITE_GRAPHQL_URL

COPY package.json bun.lock turbo.json tsconfig.base.json ./
COPY apps/frontend/package.json apps/frontend/
COPY packages/contracts/package.json packages/contracts/

RUN bun install --frozen-lockfile

COPY packages/contracts packages/contracts
COPY apps/frontend apps/frontend

RUN bun run --filter contracts generate \
 && bun run --filter contracts build \
 && bun run --filter frontend generate \
 && bun run --filter frontend build

FROM nginx:1.27-alpine AS runtime

# SPA + asset caching config
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Static bundle
COPY --from=builder /app/apps/frontend/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
