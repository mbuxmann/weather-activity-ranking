# Weather Ranking App

Small TypeScript take-home project that ranks how desirable a city will be for skiing, surfing, outdoor sightseeing, and indoor sightseeing over the next seven days.

## Stack

- Monorepo: Bun workspaces + Turborepo
- Backend: Hono + GraphQL Yoga
- Frontend: React + Vite + urql
- GraphQL types: schema-first SDL contract + GraphQL Code Generator client preset
- Testing: Vitest
- Validation: Zod
- Logging: Pino
- Retry: p-retry
- Weather data: Open-Meteo

## Architecture

```txt
apps/
  backend/
    src/
      graphql/      # Yoga schema binding and thin resolvers
      services/     # Use-case orchestration
      domain/       # Pure ranking and weather domain types
      clients/      # Open-Meteo HTTP client
      lib/          # Shared backend utilities
  frontend/
    src/
      api/          # urql client and GraphQL operation documents
      components/   # React presentation components
      api/generated.ts # Generated frontend GraphQL operation types
packages/
  contracts/        # Shared schema.graphql contract
```

The backend keeps GraphQL, services, external clients, and ranking logic separate. `packages/contracts/schema.graphql` is the source of truth for the API contract. The ranking module is pure TypeScript and can be tested without HTTP, GraphQL, or Open-Meteo.

The frontend talks to the backend through GraphQL only. It does not import backend resolver or service types. Frontend operation types are generated from the shared schema contract and `.graphql` operation documents.

## Run Locally

```bash
bun install
bun run build
bun run dev
```

Backend: `http://localhost:4000/graphql`

Frontend: `http://localhost:5173`

## Useful Commands

```bash
bun run build
bun run test
bun run typecheck
bun run generate

bun --filter backend dev
bun --filter frontend dev
```

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

## Trade-Offs

Vite is used instead of TanStack Start or Next.js because the take-home brief rewards clean frontend/backend separation, GraphQL boundaries, and testable domain logic more than full-stack framework features.

urql is used instead of Apollo because the frontend only needs straightforward GraphQL query execution.

Schema-first SDL is used instead of a code-first schema builder because the API is small and the readable contract matters more than extra abstraction.

GraphQL Code Generator is still used on the frontend so urql receives typed query documents without coupling the UI to backend internals.

The current ranking model is intentionally simple. It creates a working seam for tests and UI while leaving room to refine activity-specific heuristics, especially surfing with marine forecast data and skiing with better snow/elevation context.

## AI Usage

AI was used to compare stack trade-offs, extract the PDF requirements, and scaffold the initial architecture. The implementation keeps the important logic in small, testable modules so generated code can be reviewed and replaced safely.

## Omissions

- Surfing does not yet use Open-Meteo marine forecast data.
- Skiing does not yet account for resort elevation or ski-area availability.
- UI polish is intentionally minimal so the backend architecture and tests remain the focus.
