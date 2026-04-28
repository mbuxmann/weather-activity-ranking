# Weather Ranking App Design

## Goal

Build a small TypeScript web application for a senior engineering take-home. The app accepts a city or town and returns a seven-day ranking for skiing, surfing, outdoor sightseeing, and indoor sightseeing using Open-Meteo data.

## Architecture

Use a Turborepo monorepo with Bun workspaces. The backend lives in `apps/backend`, the frontend lives in `apps/frontend`, and shared GraphQL contract assets live in `packages/contracts`.

The backend uses Hono as the HTTP application, GraphQL Yoga at `/graphql`, and Pothos for the code-first schema. GraphQL fields stay thin and delegate to `ranking.service.ts`. The service orchestrates city lookup, weather lookup, and pure ranking logic. Ranking code lives in `domain/ranking` and does not depend on Hono, GraphQL, or Open-Meteo response shapes.

The frontend uses Vite, React, and urql. It owns UI state and GraphQL queries only. It does not import backend service or resolver types. Frontend operation types are generated from the SDL contract printed from the Pothos schema.

## Data Flow

1. User enters a city in the frontend.
2. The frontend runs the `activityRankings(city: String!)` GraphQL query.
3. The backend geocodes the city with Open-Meteo.
4. The backend fetches forecast data for the selected location.
5. The service maps external weather data into internal weather-day types.
6. Pure ranking functions return daily activity scores.
7. GraphQL maps the result into the public API shape.
8. `bun run generate` prints the SDL contract and regenerates frontend query types when the API changes.

## Testing

Prioritize backend domain and service tests because they show the strongest engineering signal:

- Unit test `rankActivities` as pure logic.
- Integration test `ranking.service` with a mocked Open-Meteo client.
- API smoke test `/graphql` through the Hono app.
- Frontend component tests are optional after the core flow is stable.

## Trade-Offs

Vite is chosen over TanStack Start and Next.js because the assignment rewards clean frontend/backend separation more than full-stack framework features. Hono is chosen for a small explicit backend surface. Pothos is chosen over hand-written SDL because it keeps schema definitions type-checked while still producing a standard GraphQL contract. urql is chosen over Apollo because the frontend only needs simple GraphQL queries. The initial scoring implementation is intentionally simple and will be refined after the scaffold is running.
