# Production Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden third-party retry behavior, backend GraphQL error formatting, and frontend error display without changing the existing GraphQL schema shape.

**Architecture:** Add structured application errors and retry policy in backend utilities/clients, map known errors to GraphQL `extensions.code` at the Yoga boundary, and map those codes to friendly frontend messages. Keep service/resolver/domain boundaries thin and test behavior at the client, service, API, and frontend mapper levels.

**Tech Stack:** Bun, TypeScript, Hono, GraphQL Yoga, urql, Vitest, Zod, p-retry.

---

### Task 1: Backend Error Taxonomy

**Files:**
- Modify: `apps/backend/src/lib/errors.ts`
- Modify: `apps/backend/src/services/ranking.service.ts`
- Test: `apps/backend/tests/integration/ranking.service.test.ts`

- [ ] **Step 1: Add failing test for empty city**

Add a test that expects `createRankingService().getActivityRankings("   ")` to reject with an app error whose code is `INVALID_CITY`.

- [ ] **Step 2: Run test to verify it fails**

Run: `bun --filter backend test tests/integration/ranking.service.test.ts`
Expected: FAIL because the service currently throws a plain `Error`.

- [ ] **Step 3: Implement structured errors**

Add `AppErrorCode`, public message support, and helper constructors in `errors.ts`. Throw `invalidCityError()` from the ranking service.

- [ ] **Step 4: Run test to verify it passes**

Run: `bun --filter backend test tests/integration/ranking.service.test.ts`
Expected: PASS.

### Task 2: Open-Meteo Retry Classification

**Files:**
- Modify: `apps/backend/src/clients/openMeteo.client.ts`
- Test: `apps/backend/tests/unit/openMeteo.client.test.ts`

- [ ] **Step 1: Add failing retry tests**

Add tests that verify transient 500 responses retry before succeeding, non-retryable 400 responses do not retry, and invalid forecast JSON maps to `WEATHER_PROVIDER_BAD_RESPONSE`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun --filter backend test tests/unit/openMeteo.client.test.ts`
Expected: FAIL because the client does not yet expose the desired classification behavior.

- [ ] **Step 3: Implement retry/error mapping**

Retry network/timeout/408/429/5xx failures only. Convert exhausted transient failures to `WEATHER_PROVIDER_UNAVAILABLE`. Convert Zod validation failures to `WEATHER_PROVIDER_BAD_RESPONSE`. Keep `LOCATION_NOT_FOUND` non-retryable.

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun --filter backend test tests/unit/openMeteo.client.test.ts`
Expected: PASS.

### Task 3: GraphQL Error Formatting

**Files:**
- Modify: `apps/backend/src/graphql/yoga.ts`
- Test: `apps/backend/tests/api/graphql.test.ts`

- [ ] **Step 1: Add failing API error tests**

Add tests that mock the ranking service throwing `LOCATION_NOT_FOUND` and an unknown error. Assert GraphQL response errors include stable `extensions.code` values and safe messages.

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun --filter backend test tests/api/graphql.test.ts`
Expected: FAIL because Yoga currently returns raw/default error formatting.

- [ ] **Step 3: Implement Yoga error masking**

Use GraphQL Yoga error masking/formatting to emit known `AppError` public messages and codes, and convert unknown errors to `INTERNAL_ERROR`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun --filter backend test tests/api/graphql.test.ts`
Expected: PASS.

### Task 4: Frontend Error Mapping

**Files:**
- Create: `apps/frontend/src/api/errorMessages.ts`
- Test: `apps/frontend/tests/errorMessages.test.ts`
- Modify: `apps/frontend/src/App.tsx`

- [ ] **Step 1: Add failing frontend mapper tests**

Add tests for `LOCATION_NOT_FOUND`, `INVALID_CITY`, `WEATHER_PROVIDER_UNAVAILABLE`, `WEATHER_PROVIDER_BAD_RESPONSE`, and fallback copy.

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun --filter frontend test tests/errorMessages.test.ts`
Expected: FAIL because the mapper does not exist.

- [ ] **Step 3: Implement mapper and use it in App**

Create `getActivityRankingErrorMessage(error)` and render that instead of raw `error.message`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun --filter frontend test tests/errorMessages.test.ts`
Expected: PASS.

### Task 5: Full Verification

**Files:**
- No new files.

- [ ] **Step 1: Regenerate GraphQL types**

Run: `bun run generate`
Expected: generated frontend GraphQL file is current.

- [ ] **Step 2: Run full checks with cache bypass**

Run: `bun run generate && bunx turbo build --force && bunx turbo typecheck --force && bunx turbo test --force`
Expected: all commands pass.

- [ ] **Step 3: Commit implementation**

Commit all implementation and test changes with message `feat: harden provider and graphql errors`.
