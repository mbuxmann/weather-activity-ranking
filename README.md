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
bun run build
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
      domain/       # Pure ranking/weather types and scoring logic
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

The backend separates GraphQL transport, use-case orchestration, provider access, and ranking rules. `apps/backend/src/domain/ranking` is deliberately pure TypeScript so the scoring model can be tested without HTTP, GraphQL, or Open-Meteo.

`packages/contracts/schema.graphql` is the source of truth for the API. The frontend consumes GraphQL through generated operation types and does not import backend service or resolver types. This keeps the boundary honest while still giving both sides strong TypeScript coverage.

## Data Flow

1. The user enters a city or town in the React app.
2. The frontend validates input with Zod and sends an `activityRankings(city: String!)` GraphQL query.
3. The backend resolves the city with Open-Meteo geocoding.
4. It fetches a 7-day daily weather forecast and, where available, a 7-day marine forecast.
5. The service joins marine data to the matching daily forecast date.
6. The pure ranking module scores all four activities for each day and sorts each day's rankings by score.
7. The frontend renders a day-by-day ranking grid plus a "best day per activity" summary.

## Current GraphQL Query

```graphql
query ActivityRankings($city: String!) {
  activityRankings(city: $city) {
    location {
      name
      country
      latitude
      longitude
    }
    days {
      date
      rankings {
        activity
        score
        reason
      }
    }
  }
}
```

## Scoring Model

Each activity receives a 0-100 score for each forecast day. The model is intentionally simple and explainable rather than pretending to be a complete travel recommendation engine.

Skiing:

- Higher with colder max temperatures, especially at or below 2 C
- Higher with fresh snowfall
- Lower with high wind above 35 kph
- No new snow does not automatically mean 0 because Open-Meteo daily snowfall is new snowfall, not snowpack or resort availability

Surfing:

- Requires marine forecast data; inland/no-marine locations return 0 for surfing
- Best wave-height range is 1-2.5 m
- Marginal wave-height ranges still score: 0.5-1 m and 2.5-4 m
- Higher with wave periods at or above 8 s
- Higher with warmer air, especially at or above 20 C
- Lower with heavy rain above 15 mm

Outdoor sightseeing:

- Higher with comfortable max temperatures, 16-28 C
- Higher on dry days, especially at or below 2 mm precipitation
- Lower with high wind above 35 kph

Indoor sightseeing:

- Higher when outdoor conditions are less comfortable
- Higher with heavy rain, strong wind, or uncomfortable temperatures below 10 C or above 32 C

## Technical Choices

### GraphQL And Shared Contracts

GraphQL was used because the brief explicitly asks for React, Node.js, and GraphQL. The API surface is intentionally small, so I used schema-first SDL rather than a code-first schema builder. That keeps the contract easy to review in one file and makes it obvious what the frontend is allowed to ask for.

The schema lives in `packages/contracts`, alongside shared enum labels and lightweight derivation helpers. This avoids duplicated string literals like activity names across backend and frontend, while still keeping backend implementation details out of the UI.

GraphQL Code Generator is used for frontend operation types. This gives the React app typed query results without importing backend resolver or service types, which preserves the API boundary.

The contracts package has a browser-safe barrel export and a separate Node-only export for the schema path. That split is intentional: it lets the browser import shared enums and labels without accidentally pulling Node.js built-ins into the Vite bundle.

### Backend Framework

The backend uses Hono with GraphQL Yoga. Hono gives a small HTTP layer for CORS, health checks, and testable request handling. GraphQL Yoga handles GraphQL execution and error masking without requiring a heavier framework.

I chose Hono over NestJS because the brief is time-boxed and the backend has one main use case: resolve a city, fetch weather, and rank activities. Hono keeps the implementation small enough that the domain boundaries are visible without a lot of framework ceremony.

That is a deliberate trade-off, not a claim that Hono is always the better enterprise choice. NestJS would be stronger for a larger backend with multiple domains, richer dependency injection, module-level ownership, guards/interceptors, standardized testing patterns, and more team-wide conventions. If this became a long-lived production service with many workflows, I would strongly consider moving toward NestJS or introducing similar module boundaries.

The ranking service accepts its Open-Meteo client as a dependency. That makes the main use case easy to test without network calls and keeps provider concerns out of GraphQL resolvers.

Application errors are mapped to stable GraphQL error codes and user-safe messages. Unexpected errors are masked by GraphQL Yoga so implementation details and stack traces do not leak to the client, while expected cases like invalid input, location not found, and provider failure remain actionable.

### Frontend Framework

The frontend uses React with Vite. I chose Vite over Next.js because the app is a single interactive workflow and the brief already asks for a separate backend. Vite is quick to scaffold, fast to iterate on, and keeps the frontend focused on client-side search, request state, and result presentation.

Next.js would be a reasonable choice if the product needed routing, SSR/SEO, server actions, edge rendering, or a larger web surface. For this exercise, those features would add more structure than the problem needs and blur the intentionally separate React/Node/GraphQL architecture.

urql is used instead of Apollo Client because the app only needs a single query flow, generated operation types, and basic request state. It is smaller and easier to reason about for this scope.

Apollo Client would be the stronger choice if the frontend grew into a larger GraphQL application with normalized cache requirements, pagination, optimistic updates, complex local state, or a team that benefits from Apollo's broader ecosystem and conventions.

The UI is componentized around the user workflow: search, status, summary, per-day cards, and scoring explanation. Client-side Zod validation gives immediate feedback, while backend validation still owns the trusted boundary.

shadcn/ui and Tailwind CSS were chosen because they provide strong primitives without locking the UI into a heavy design system. shadcn/ui gives accessible component foundations that can be copied, inspected, and modified locally; Tailwind keeps styling close to the component and makes iteration fast.

This also works well with AI-assisted development. AI is more effective when the codebase has clear conventions and reusable primitives: use the existing `Button`, `Badge`, `Dialog`, `Alert`, and form patterns instead of inventing new component structures every time. The result is faster UI work with less drift.

I kept the UI as a focused single-screen experience rather than adding routing, saved searches, maps, or account features. That keeps the user path aligned with the brief: enter a city, understand the ranking, and see the reasoning behind the scores.

### Validation And Error UX

The frontend validates city input with Zod to give immediate feedback for empty, too-short, too-long, or clearly invalid input. The backend still trims and validates the city again because client validation is a convenience, not a trust boundary.

React Hook Form is used with Zod because it keeps form state lightweight while giving one validation schema for runtime checks and inferred TypeScript types. This reduces frontend drift and makes it clearer for both humans and AI agents what valid input looks like.

The backend returns stable error codes from the shared contracts package. The frontend maps those codes to friendly messages instead of displaying raw GraphQL or provider errors. This keeps user feedback understandable while preserving room for observability on the server side.

### Weather Provider Integration

Open-Meteo access is isolated behind `OpenMeteoClient`. The rest of the backend asks for location, daily forecast, and marine forecast data without knowing endpoint URLs or provider response shapes.

Provider responses are validated with Zod before they enter the domain layer. Daily forecasts are required to contain seven complete daily values; partial or malformed provider responses become safe application errors instead of silently producing misleading scores.

Transient provider failures are retried with `p-retry`, non-retryable errors fail fast, and requests have a timeout. This is small enough for a take-home but demonstrates the operational shape a production integration would need.

### Caching Strategy

The backend uses a small in-memory TTL cache for geocoding, forecast, and marine responses. This reduces repeated Open-Meteo calls during local testing and common repeated searches without adding another service to run.

I chose in-memory caching over Redis for this version because the exercise is time-boxed, the app has one backend process in the default local setup, and the cache is an optimization rather than a source of truth. Redis would add deployment, configuration, connection handling, and failure modes that are valuable in production but disproportionate for this take-home.

The trade-off is that cache entries are process-local, disappear on restart, are not shared across instances, and currently have no hard size cap. If this service needed horizontal scaling or sustained traffic, I would replace the cache interface with a Redis-backed implementation, add bounded keys/TTL policies, and keep the current in-memory cache as a test/local fallback.

### Ranking Logic

The ranking model is deliberately heuristic and explainable. Each activity has a small pure scoring function returning a score and a human-readable reason. This keeps the logic testable and makes it easy to show users why a day ranked well.

Surfing uses Open-Meteo marine data because the normal weather forecast cannot tell whether there are rideable waves. If marine data is unavailable for a location, surfing returns 0 with an explicit reason.

Skiing does not return 0 just because daily snowfall is 0. Open-Meteo's snowfall value is new snowfall for that day, not current snowpack or resort availability, so a no-new-snow day can still be skiable at a resort. That limitation is called out in the trade-offs.

### Runtime And Tooling

Bun is used as the package manager and dev runner because workspaces and Turborepo make the monorepo commands fast and simple. The backend code itself targets Node.js through Hono's Node server adapter, so Bun is not a runtime lock-in for the application logic.

Turborepo coordinates build, test, and typecheck tasks across the backend, frontend, and contracts package. This keeps generated contract artifacts in the right order without hand-written shell choreography.

Dockerfiles and `docker-compose.yml` are included to show a credible deployment path. The frontend is built as static assets served by Nginx, and the backend exposes a health check and configurable CORS.

The frontend API URL is configured with `VITE_GRAPHQL_URL` at build time because Vite bakes environment values into the static bundle. The backend CORS origins are runtime-configurable through `CORS_ORIGINS` because deployment URLs can differ between local development, preview, and production.

## Reliability And Operations

- `/health` endpoint for container health checks
- Configurable backend CORS via `CORS_ORIGINS`
- `VITE_GRAPHQL_URL` build arg/env for frontend API targeting
- Request timeout on provider calls
- Retry only for retryable provider failures
- Safe GraphQL error masking for unexpected failures
- Structured logs around ranking lifecycle and provider cache behavior

## Testing

The test suite focuses on fast, high-signal coverage:

- Backend unit tests for activity scoring, ranking sorting, cache behavior, and Open-Meteo response handling
- Backend integration tests for ranking-service orchestration
- GraphQL API tests for success and safe error behavior
- Frontend integration tests for search and ranking rendering
- Frontend validation/security tests for city input handling
- Shared contract helper tests for "best day per activity" derivation

I prioritized unit and integration tests because most risk in this app sits in provider mapping, scoring rules, GraphQL error behavior, and UI state rendering. Full browser E2E would be useful before production, but it would add setup/runtime cost for less incremental confidence during a 2-3 hour exercise.

Run:

```bash
bun run typecheck
bun run test
bun run build
```

## AI Usage

AI was used throughout the project, but mainly as a thinking, scaffolding, and review partner rather than as an unchecked source of truth.

ChatGPT was used early to unpack the PDF brief, sanity-check the interpretation of the instructions, and discuss architectural trade-offs. This included conversations around Hono vs NestJS, Vite React vs Next.js, urql vs Apollo Client, schema-first GraphQL, caching options, and what level of implementation would be appropriate for a 2-3 hour senior-engineer exercise.

Superpowers was used as a structured workflow layer for planning and implementation. It helped break the work into phases, scaffold the project shape, generate focused implementation plans, and keep the work aligned with the brief instead of drifting into unrelated product features.

Claude Code planning mode was used for parts of the implementation planning and review process, especially when deciding how to sequence changes, where to add tests, and how to audit the code against the requirements before tightening the README.

Parallel agents were used for some bounded review and implementation tasks, such as checking separate parts of the codebase, looking for missing trade-offs, and validating that the frontend/backend/contracts boundaries were still coherent.

A frontend design skill was used to improve the UI direction and interaction polish. That helped move the interface beyond a plain scaffold while keeping the product scope small: search, status, rankings, and scoring explanation stayed the core experience.

AI-generated output was treated as draft material. I kept the important behavior in small modules, added tests around scoring/provider/error behavior, and reviewed generated suggestions against the actual code and the PDF brief before accepting them.

Several package choices were made to make AI-assisted development safer and faster: schema-first GraphQL plus codegen for end-to-end types, shared contracts for stable enums/error codes, Zod for runtime validation, React Hook Form for predictable form state, and shadcn/ui/Tailwind for consistent UI primitives. Those constraints gave AI tools clearer boundaries and made generated changes easier to review.

One lesson from the process is that AI is most useful when the foundation is already strong. Clear module boundaries, generated types, small pure functions, reusable UI primitives, and focused tests give AI concrete reference points. That makes it more likely to extend the existing code style and contracts instead of inventing parallel patterns.

## Omissions And Trade-Offs

These were deliberate scope choices for a 2-3 hour take-home. I prioritized a clean architecture, typed contracts, provider resilience, and testable ranking logic over building every production feature.

| Area | What was omitted or simplified | Why it was skipped | How I would fix it |
| --- | --- | --- | --- |
| Skiing domain depth | No resort availability, elevation, snowpack, lift status, or ski-area matching. | Open-Meteo daily snowfall is enough to demonstrate the scoring boundary, but not enough for a production ski recommendation engine. Adding resort data would have consumed the time budget and shifted focus away from architecture. | Add resort/location metadata, elevation-aware matching, snow-depth data, lift status, and a ski-area availability layer before scoring. |
| Surfing domain depth | No surf spot metadata, tide, wind direction, bathymetry, or local break suitability. | Marine forecast data adds a meaningful coastal signal while keeping the integration small. Full surf quality is highly local and would require a separate surf-domain model. | Add surf spot data, tide and wind-direction inputs, break-type metadata, and spot-specific scoring curves. |
| City disambiguation | The first Open-Meteo geocoding result is used. | This keeps the search flow fast and simple for the exercise. A full disambiguation UI would add extra state, screens, and API shape decisions. | Return multiple candidate locations from the backend and let the user choose the intended city before fetching rankings. |
| Cache layer | Process-local in-memory TTL cache instead of Redis or another shared cache. | Caching is an optimization here, not source-of-truth state. Redis would add infrastructure, deployment configuration, and failure modes that are disproportionate for the local take-home setup. | Keep the cache interface and swap in Redis with bounded keys, explicit TTL policies, shared instance state, and local in-memory fallback for tests/dev. |
| Scoring model | Explainable heuristics instead of a calibrated recommendation model. | Simple weighted heuristics are transparent, easy to test, and appropriate for showing architecture. A calibrated model would require data collection, domain expertise, and validation beyond the brief. | Collect historical weather/activity-quality data, validate against user feedback or domain labels, and tune activity-specific scoring curves. |
| E2E coverage | Focused unit/integration tests instead of full Playwright browser coverage. | Most risk sits in provider mapping, scoring, GraphQL errors, and UI state. Full browser E2E would add setup/runtime cost for less incremental confidence in the time box. | Add Playwright coverage for search success, validation errors, provider failures, and responsive rendering in CI. |
| UI/product polish | No saved locations, search history, maps, localization, accounts, or personalization. | The brief asks for a minimal web app with strong technical foundations. These product features would widen scope without improving the core architecture signal. | Add persisted user preferences, saved searches, map/location selection, localization, and personalized scoring once the core workflow is stable. |
| Accessibility polish | Accessible primitives and labels are used, but no full accessibility audit was completed. | shadcn/ui/Radix primitives provide a good baseline, but a proper audit takes dedicated time across keyboard, screen reader, contrast, and responsive states. | Run axe/Playwright accessibility checks, manual keyboard and screen-reader passes, and fix any contrast/focus/announcement gaps. |
| Observability | Structured logs exist, but there are no metrics, traces, dashboards, or alerting. | Logs are enough to demonstrate operational intent in a small service. Production observability would add vendor/tooling decisions outside the core exercise. | Add request metrics, provider latency/error counters, tracing, dashboarding, and alerts for provider failures and high error rates. |
| Deployment hardening | Docker and compose are included, but no CI/CD pipeline, secrets workflow, rate limiting, or production monitoring. | The deployment path is credible without turning the take-home into infrastructure work. CI/CD and platform controls depend on the target hosting environment. | Add CI for typecheck/test/build, secret management, rate limiting, production env validation, deployment previews, and health/monitoring checks. |

The current architecture keeps these improvements additive: most of them can be introduced behind the existing client, service, contract, and UI boundaries without rewriting the app.
