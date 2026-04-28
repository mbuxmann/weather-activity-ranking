# Production Hardening Design

## Goal

Improve the weather ranking app's production readiness around third-party failures, domain errors, GraphQL error formatting, and frontend error display while keeping the existing GraphQL query shape unchanged.

## Current Behavior

The Open-Meteo client already retries failed `fetch` calls with `p-retry`, but the retry policy is not explicit enough about which failures are retryable. Domain errors such as missing locations are thrown as `AppError`, but GraphQL Yoga currently exposes them as generic GraphQL errors. The frontend renders `error.message` from urql directly, which leaks transport/API wording instead of showing a user-friendly state.

## Chosen Approach

Keep the existing schema:

```graphql
type Query {
  activityRankings(city: String!): ActivityRankingResult!
}
```

Use GraphQL errors with stable `extensions.code` values instead of changing the schema to a union. This keeps the API simple for a take-home project while still giving the frontend enough structure to present clean messages.

## Error Taxonomy

Use a small set of application error codes:

- `INVALID_CITY`: empty or invalid city input.
- `LOCATION_NOT_FOUND`: geocoding succeeded but no matching location exists.
- `WEATHER_PROVIDER_UNAVAILABLE`: Open-Meteo returned a retryable failure or timed out after retries.
- `WEATHER_PROVIDER_BAD_RESPONSE`: Open-Meteo returned data that failed validation.
- `INTERNAL_ERROR`: unexpected backend failure.

Each application error should carry an HTTP-ish status code for logging and test expectations, but GraphQL responses will remain HTTP 200 unless the request itself is malformed.

## Retry Policy

Retry only transient third-party failures:

- Network failures.
- Request timeout.
- HTTP 408, 429, and 5xx responses.

Do not retry:

- `LOCATION_NOT_FOUND`.
- `INVALID_CITY`.
- Open-Meteo validation failures after a successful response.
- HTTP 4xx responses other than 408 and 429.

Use a small bounded policy suitable for the take-home: two retries, short exponential backoff, and a per-request timeout. Keep the retry wrapper local to the Open-Meteo client or a tiny backend utility so it can be tested without GraphQL.

## Backend Design

Add or refine `AppError` helpers so service/client code throws structured errors instead of plain `Error` where the frontend needs predictable behavior.

Map errors at the GraphQL boundary using Yoga's error masking/formatting hooks:

- Known `AppError` values become GraphQL errors with `extensions.code` and a safe public message.
- Unknown errors become `INTERNAL_ERROR` with a generic public message.
- Backend logs should preserve enough detail for debugging without leaking internals to the user.

Keep resolvers thin. The ranking service should validate empty city input and delegate provider failures to the client.

## Frontend Design

Add a small error mapper near the GraphQL client or feature UI. It should inspect `CombinedError.graphQLErrors[0].extensions.code` and return friendly copy:

- `LOCATION_NOT_FOUND`: "We couldn't find that city or town. Check the spelling and try again."
- `INVALID_CITY`: "Enter a city or town to see activity rankings."
- `WEATHER_PROVIDER_UNAVAILABLE`: "Weather data is temporarily unavailable. Try again in a moment."
- `WEATHER_PROVIDER_BAD_RESPONSE`: "Weather data came back in an unexpected format. Try another location or try again later."
- fallback: "Something went wrong while ranking activities. Try again."

The UI should show this message in the existing error area and avoid exposing raw GraphQL transport text.

## Testing Strategy

Add tests at the boundaries where failures become user-visible:

- Open-Meteo client retries transient failures and does not retry non-retryable failures.
- Ranking service maps empty city to `INVALID_CITY`.
- GraphQL API returns stable `extensions.code` for missing location and provider failure.
- Frontend error mapper converts known codes to friendly messages and has a safe fallback.

Prefer unit tests for retry/error helpers and API tests for GraphQL formatting. Avoid browser-heavy tests unless the UI behavior becomes more complex.

## Out of Scope

- Full observability stack, distributed tracing, metrics, or alerting.
- Circuit breakers and persistent caching.
- Changing the GraphQL schema to typed error unions.
- Advanced frontend retry UX.
