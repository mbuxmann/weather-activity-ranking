# Weather Ranking App

Small TypeScript take-home project that ranks how desirable a city will be for skiing, surfing, outdoor sightseeing, and indoor sightseeing over the next seven days.

## Stack

- Monorepo: Bun workspaces + Turborepo
- Backend: Hono + GraphQL Yoga + Pothos
- Frontend: React + Vite + urql
- GraphQL types: generated SDL contract + GraphQL Code Generator client preset
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
      graphql/      # Pothos schema and generated SDL printer
      services/     # Use-case orchestration
      domain/       # Pure ranking and weather domain types
      clients/      # Open-Meteo HTTP client
      lib/          # Shared backend utilities
  frontend/
    src/
      api/          # urql client and GraphQL operation documents
      components/   # React presentation components
      gql/          # Generated frontend GraphQL operation types
packages/
  contracts/        # Generated GraphQL schema contract
```

The backend keeps GraphQL, services, external clients, and ranking logic separate. Pothos is the source of truth for the GraphQL schema, and `bun run generate` prints `packages/contracts/schema.graphql` from that code-first schema. The ranking module is pure TypeScript and can be tested without HTTP, GraphQL, or Open-Meteo.

The frontend talks to the backend through GraphQL only. It does not import backend resolver or service types. Frontend operation types are generated from the printed schema contract and `.graphql` operation documents.

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

Pothos is used instead of hand-written SDL because the backend schema can stay code-first and type-checked while still generating a standard GraphQL schema contract for frontend tooling.

The current ranking model is intentionally simple. It creates a working seam for tests and UI while leaving room to refine activity-specific heuristics, especially surfing with marine forecast data and skiing with better snow/elevation context.

## AI Usage

AI was used to compare stack trade-offs, extract the PDF requirements, and scaffold the initial architecture. The implementation keeps the important logic in small, testable modules so generated code can be reviewed and replaced safely.

## Omissions

- Surfing does not yet use Open-Meteo marine forecast data.
- Skiing does not yet account for resort elevation or ski-area availability.
- UI polish is intentionally minimal so the backend architecture and tests remain the focus.
