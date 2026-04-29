# Weather-Based Activity Rankings

TypeScript take-home project for the Lead/Senior Engineer test. The app accepts a city or town and ranks how desirable the next 7 days are for:

- Skiing
- Surfing
- Outdoor sightseeing
- Indoor sightseeing

The goal is not to be a fully featured travel product. The implementation prioritizes clear boundaries, maintainable domain logic, typed contracts, and explicit trade-offs.

## Tech Stack

- Monorepo: Bun workspaces + Turborepo
- Backend: Node.js, Hono, GraphQL Yoga
- Frontend: React, Vite, urql
- Shared contract: schema-first GraphQL SDL in `packages/contracts`
- Weather data: Open-Meteo geocoding, forecast, and marine APIs
- Validation: Zod
- Logging: Pino
- Provider resilience: p-retry, request timeouts, safe error mapping
- Testing: Vitest, React Testing Library
- Deployment path: Dockerfiles + docker-compose

## How To Run

```bash
bun install
bun run dev
```

Backend GraphQL endpoint:

```txt
http://localhost:4000/graphql
```

Frontend:

```txt
http://localhost:5173
```

Useful commands:

```bash
bun run generate
bun run typecheck
bun run test
bun run build

bun --filter backend dev
bun --filter frontend dev
```

Docker:

```bash
docker compose up --build
```

For deployed Docker builds, set:

- `PUBLIC_API_URL`: browser-facing GraphQL URL, for example `https://api.example.com/graphql`
- `PUBLIC_WEB_URL`: browser-facing frontend URL, used by backend CORS

## Architecture Overview

```txt
apps/
  backend/
    src/
      graphql/      # Yoga schema binding and thin resolvers
      services/     # Application use cases and orchestration
      domain/       # Ranking/weather types and scoring logic
      clients/      # Open-Meteo HTTP client
      lib/          # Cache, logging, and error utilities
  frontend/
    src/
      api/          # urql client, GraphQL operation, generated operation types
      components/   # React UI components
      schemas/      # Client-side form validation
      lib/          # UI-friendly ranking derivations and formatting
packages/
  contracts/        # Shared GraphQL schema, enums, labels, helper types
```

The backend separates GraphQL transport, application orchestration, Open-Meteo access, and ranking rules. This keeps the scoring logic easy to test without calling HTTP, GraphQL, or live weather APIs.

`packages/contracts/schema.graphql` is the source of truth for the API. The frontend consumes GraphQL through generated operation types and does not import backend service or resolver types. This keeps the boundary honest while still giving both sides strong TypeScript coverage.

## Scoring Model

Each activity gets a 0-100 score for each forecast day using simple, explainable weather heuristics:

- Skiing favors colder days, snowfall, and lower wind.
- Surfing favors available marine data, rideable wave height, longer wave period, and milder weather.
- Outdoor sightseeing favors comfortable, dry, low-wind days.
- Indoor sightseeing scores higher when outdoor conditions are rainy, windy, too cold, or too hot.

The model is intentionally lightweight for the take-home and is not meant to replace resort, surf-spot, or local activity data.

## Technical Choices

- **Schema-first GraphQL:** `packages/contracts/schema.graphql` is the API source of truth. GraphQL Code Generator produces typed frontend operations.
- **Small Node backend:** Hono handles HTTP concerns like CORS and health checks; GraphQL Yoga handles GraphQL execution and error masking.
- **Focused React frontend:** Vite keeps the app lightweight. urql is enough for the single query flow.
- **Isolated Open-Meteo client:** Weather API calls, response validation, retries, timeouts, and caching are handled in one client instead of inside GraphQL resolvers or scoring logic.
- **Explainable ranking:** Each activity has a small scoring function that returns a 0-100 score and a user-facing reason.
- **Monorepo tooling:** Bun workspaces and Turborepo coordinate install, build, test, and typecheck tasks across the apps and shared contracts.
- **Scoped production signals:** Dockerfiles, health checks, configurable CORS, request timeouts, retries, structured logs, and safe GraphQL errors are included without turning the take-home into an infrastructure project.

I chose Hono over NestJS because this service has one main workflow: resolve a city, fetch weather, and rank activities. Hono keeps the backend small while still allowing clear boundaries around GraphQL, provider access, and scoring. For a larger service with multiple domains, richer dependency injection, guards, interceptors, and team-wide module conventions, NestJS would be a stronger fit.

I chose Vite React over Next.js or TanStack Start because the frontend is a single client-side workflow backed by a separate GraphQL API. SSR, routing, server functions, and SEO would add framework surface area without helping the core requirement. If the app grew into a larger routed product, either Next.js or TanStack Start would be reasonable to revisit.

I used TypeScript, generated GraphQL types, Zod, and React Hook Form to keep validation and data flow type-safe end to end. shadcn/ui and Tailwind CSS provide battle-tested, accessible UI primitives while still keeping the components easy to inspect and customize. Those choices also make AI-assisted development safer: the model has clear contracts, validation schemas, and reusable UI primitives to follow instead of inventing parallel patterns.

## Testing

The test suite focuses on fast, high-signal coverage:

- Backend unit tests for activity scoring, ranking sorting, cache behavior, and Open-Meteo response handling
- Backend integration tests for ranking-service orchestration
- GraphQL API tests for success and safe error behavior
- Frontend integration tests for search and ranking rendering
- Frontend validation tests for city input handling
- Shared contract helper tests for "best day per activity" derivation

I prioritized unit and integration tests because most risk in this app sits in provider mapping, scoring rules, GraphQL error behavior, and UI state rendering. Full browser E2E would be useful before production, but it would add setup/runtime cost for less incremental confidence during a 2-3 hour exercise.

Run:

```bash
bun run typecheck
bun run test
bun run build
```

## AI Usage

I used AI as a way to move faster through the engineering loop, not as a replacement for deciding what to build.

At the start, I gave the PDF brief to ChatGPT and used it to pressure-test my initial direction: React/Vite frontend, Node/GraphQL backend, Open-Meteo integration, shared contracts, and a small but explainable scoring model. I used that discussion to compare options like Hono vs NestJS and Vite React vs Next.js/TanStack Start, then kept the choices that fit the time box and the brief.

Before scaffolding the project, I used Codex with the Superpowers plugin to turn the direction into specs and implementation plans. That meant the agent was working from a reviewed plan: package structure, GraphQL contract, provider client boundaries, scoring rules, test coverage, and README trade-offs were decided before implementation started.

For the frontend, I used a frontend design skill to get from a plain scaffold to a more polished interface quickly. I still kept the UI constrained to the required workflow: search for a city, see the seven-day rankings, and understand the scoring. The design pass helped with layout, hierarchy, and component polish, while shadcn/ui and Tailwind kept the output grounded in reusable primitives.

During implementation and polishing, I used ChatGPT, Codex, and Claude to compare approaches, tighten copy, review edge cases, and run bounded tasks in parallel. I did not accept agent output blindly: I reviewed the plans and diffs, adjusted the implementation to match the intended architecture, and kept the important behavior covered by tests around scoring, provider mapping, GraphQL errors, frontend validation, and rendering.

## Omissions And Trade-Offs

These were deliberate scope choices for a 2-3 hour take-home. I prioritized a clean architecture, typed contracts, provider resilience, and testable ranking logic over building every production feature.

| Area | What was omitted or simplified | Why it was skipped | How I would fix it |
| --- | --- | --- | --- |
| Skiing suitability | Skiing uses weather signals only; it does not check whether the location is near a ski resort, has enough elevation, existing snowpack, or open lifts. | Resort matching is harder than surfing availability because it needs separate resort/location data, elevation, snow depth, and availability sources. | Add resort metadata, elevation-aware matching, snowpack data, and lift/resort availability before scoring ski days. |
| Surfing depth | Surfing returns 0 when no usable marine forecast is available, but it does not model surf spots, tide, wind direction, bathymetry, or local break quality. | Marine data was enough to make surfing meaningfully location-aware within the time box. Full surf quality is highly local. | Add surf spot data, tide and wind-direction inputs, break metadata, and spot-specific scoring curves. |
| City disambiguation | The first Open-Meteo geocoding result is used. | A selection flow would add UI/API scope. | Return candidate locations and let the user choose. |
| Cache layer | In-memory TTL cache only. | Redis/shared caching is unnecessary for the local take-home setup. | Keep the cache interface and add Redis for production. |
| Personal preferences | Rankings use a general scoring model rather than asking the user about preferences such as temperature tolerance, rain tolerance, skill level, or activity priorities. | A preference model would add product and API complexity beyond the core requirement. | Add user-adjustable preferences and weight the activity scores based on those inputs. |
| Scoring model | Explainable heuristics instead of calibrated recommendations. | Transparent rules are easier to review and test in the time box, but they will not match every user's preferences. | Tune scores with historical data, domain input, user feedback, and configurable weighting. |
| Frontend state | State is kept local and passed through props instead of using a shared client store. | The current UI has one main workflow, so adding Zustand would be unnecessary structure for this scope. | Add Zustand or a similar store if preferences, saved searches, filters, or cross-page state are introduced. |
| Test coverage | Tests cover the main backend, scoring, provider, GraphQL, and UI paths, but there is no full browser E2E suite, Storybook coverage, or broad visual/regression safety net. | I prioritized focused unit and integration tests over a wider test matrix for the time box. | Add Playwright coverage for search, errors, and responsive rendering; add Storybook for component states and visual regression; add coverage thresholds around high-risk flows. |
| Product polish | No saved locations, maps, accounts, localization, or personalization. | These would widen scope without improving the core requirement. | Add them once the core ranking workflow is stable. |
| Production hardening | No CI/CD pipeline, rate limiting, metrics, tracing, or alerting. | Docker, health checks, logs, and safe errors show the intended shape without overbuilding. | Add CI, rate limits, metrics, traces, dashboards, and alerts. |

The current architecture keeps these improvements additive: most of them can be introduced behind the existing client, service, contract, and UI boundaries without rewriting the app.
