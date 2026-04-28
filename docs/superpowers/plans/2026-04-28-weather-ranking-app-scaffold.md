# Weather Ranking App Scaffold Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold a runnable Turborepo application with a Hono + GraphQL Yoga backend, Vite + React + urql frontend, shared GraphQL contract package, and initial tests.

**Architecture:** The root workspace coordinates builds through Turborepo. Backend logic is separated into GraphQL, service, client, and pure domain modules. Frontend code owns rendering and GraphQL query execution only.

**Tech Stack:** pnpm, Turborepo, TypeScript, Hono, GraphQL Yoga, React, Vite, urql, Vitest, Zod, Pino, p-retry.

---

### Task 1: Workspace Foundation

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `turbo.json`
- Create: `tsconfig.base.json`
- Create: `.gitignore`

- [x] **Step 1: Add root workspace files**

Create pnpm workspace and Turbo scripts for `build`, `dev`, `test`, and `typecheck`.

- [x] **Step 2: Verify workspace discovery**

Run: `pnpm install`

Expected: pnpm installs all workspace dependencies.

### Task 2: Shared Contract Package

**Files:**
- Create: `packages/contracts/package.json`
- Create: `packages/contracts/tsconfig.json`
- Create: `packages/contracts/src/schema.ts`
- Create: `packages/contracts/schema.graphql`

- [x] **Step 1: Add the GraphQL schema contract**

Define `activityRankings(city: String!)` and related ranking types.

- [x] **Step 2: Build the package**

Run: `pnpm --filter @weather-ranking/contracts build`

Expected: TypeScript emits `dist`.

### Task 3: Backend Scaffold

**Files:**
- Create: `apps/backend/package.json`
- Create: `apps/backend/tsconfig.json`
- Create: `apps/backend/vitest.config.ts`
- Create backend source and tests under `apps/backend/src` and `apps/backend/tests`.

- [x] **Step 1: Add Hono, GraphQL Yoga, clients, service, domain, and tests**

Create compileable modules with a simple replaceable ranking implementation.

- [x] **Step 2: Verify backend tests**

Run: `pnpm --filter @weather-ranking/backend test`

Expected: all backend tests pass.

### Task 4: Frontend Scaffold

**Files:**
- Create: `apps/frontend/package.json`
- Create: `apps/frontend/index.html`
- Create: `apps/frontend/tsconfig.json`
- Create: `apps/frontend/vite.config.ts`
- Create frontend source under `apps/frontend/src`.

- [x] **Step 1: Add Vite React app with urql**

Create a minimal city search UI and result cards.

- [x] **Step 2: Verify frontend build**

Run: `pnpm --filter @weather-ranking/frontend build`

Expected: Vite builds successfully.

### Task 5: Repository Verification

**Files:**
- Create: `README.md`

- [x] **Step 1: Document architecture and trade-offs**

Explain the stack choices, AI usage, and current omissions.

- [x] **Step 2: Run full workspace checks**

Run: `pnpm build`, `pnpm test`, and `pnpm typecheck`.

Expected: all checks complete successfully.
