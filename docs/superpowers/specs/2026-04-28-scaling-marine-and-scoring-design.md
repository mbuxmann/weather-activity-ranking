# Scaling, Marine Forecast, and Scoring Refinement Design

## Goal

Demonstrate scaling thinking, close the most visible gap in the take-home brief (surfing using actual marine data), and tighten test coverage and abstraction quality in the core ranking domain — without changing the GraphQL contract or expanding the feature surface.

This work is the second batch of improvements following production-hardening. The previous batch addressed third-party failures, GraphQL error masking, and frontend error display. This batch addresses request volume, data correctness, and domain code clarity.

## Scope Summary

Five focused changes:

1. In-memory TTL caching for Open-Meteo geocoding, forecast, and marine responses.
2. Marine forecast integration for surfing scoring with honest "no coastal data" handling.
3. Direct unit tests for each scoring function and the new tier helper.
4. A small `tier()` helper that replaces repeated threshold-bonus patterns in `scoring.ts`.
5. README clarification on Bun-as-tooling vs Node.js-as-runtime.

No GraphQL schema changes. No new external dependencies.

## 1. Caching Layer

### Why Three Caches

The three datasets change at different rates. A single TTL forces a bad compromise:

| Cache | Underlying data changes | Open-Meteo refresh | TTL |
|---|---|---|---|
| Geocoding | Cities don't move | Effectively never | 24h |
| Forecast | Weather forecast | A few times daily | 30min |
| Marine | Marine forecast | A few times daily | 30min for hits, 24h for `null` |

A 30min TTL would re-geocode "Cape Town" 48 times per day for nothing. A 24h TTL would serve day-old weather. So one helper, three configurations.

### `null` is a Cacheable Value

For landlocked locations, the marine API returns no usable data. That determination is itself worth caching — without it, every search for Denver pings the marine API and gets a 400 back forever. `null` cached for 24h reflects the underlying geography, which is even more stable than coordinates.

The marine cache stores `MarineDay[] | null`. When the value is `null`, the TTL is 24h. When it has data, the TTL is 30min.

### Helper Shape

`apps/backend/src/lib/cache.ts` exports a single factory:

```ts
type TtlCache<T> = {
  get(key: string): T | undefined;
  set(key: string, value: T, ttlOverrideMs?: number): void;
};

export const createTtlCache = <T>(defaultTtlMs: number): TtlCache<T>;
```

Implementation: a `Map<string, { value: T; expiresAt: number }>` with lazy eviction (entries are removed on `get()` if expired). No background timer. No size cap (YAGNI for take-home — flagged in README "Future Improvements").

Optional `ttlOverrideMs` on `set()` lets the marine cache hold `null` longer than data without needing a second cache instance.

### Cache Keys

| Cache | Key |
|---|---|
| Geocoding | `city.trim().toLowerCase()` |
| Forecast | `${lat.toFixed(2)},${lon.toFixed(2)}` |
| Marine | `${lat.toFixed(2)},${lon.toFixed(2)}` |

Two-decimal lat/lon coalesces nearby coordinates (~1km precision), which is appropriate for both forecast types and improves cache hit rate when a user searches "London" then "London, UK".

### Wiring

`createOpenMeteoClient` accepts optional cache instances:

```ts
export const createOpenMeteoClient = (deps?: {
  geocodingCache?: TtlCache<Location>;
  forecastCache?: TtlCache<WeatherDay[]>;
  marineCache?: TtlCache<MarineDay[] | null>;
}): OpenMeteoClient
```

Defaults are created in-line if not provided. Tests pass fresh instances or zero-TTL instances for isolation.

## 2. Marine Forecast for Surfing

### Approach: Honest N/A (Option B)

Try the marine API; if it returns no data for the location, surfing scores `0` with reason `"No coastal forecast available for this location."` Other three activities still rank normally.

This is closer to the existing error-handling philosophy (`AppError` codes, `reason` field is already part of the schema) than fabricating a score from land weather.

### New Domain Type

`apps/backend/src/domain/weather/types.ts`:

```ts
export type MarineDay = {
  date: string;
  waveHeightMaxM: number;
  wavePeriodMaxS: number;
  windWaveHeightMaxM: number;
};
```

`WeatherDay` extends with optional marine data:

```ts
export type WeatherDay = {
  // ... existing fields
  marine?: MarineDay;
};
```

### Client Method

```ts
getMarineForecast(location: Location): Promise<MarineDay[] | null>
```

Endpoint: `https://marine-api.open-meteo.com/v1/marine`

Variables (daily): `wave_height_max`, `wave_period_max`, `wind_wave_height_max`.

Behavior:
- Successful response with non-empty daily arrays → return parsed `MarineDay[]`.
- Successful response with empty arrays → return `null` (cached for 24h).
- HTTP 400 → return `null` (cached for 24h). The marine API returns 400 for inland coordinates; this is a business outcome, not an error.
- HTTP 5xx / network failure / timeout → throw `weatherProviderUnavailableError` (same pattern as existing forecast). Marine API outages should not silently mask surfing scores.
- Bad JSON / Zod failure → throw `weatherProviderBadResponseError`.

The 400-as-business-outcome distinguishes this from the existing forecast retry policy where 400 is non-retryable but still an error.

### Implementation Note: Differentiated 400 Handling

The existing `fetchJson` helper treats any non-OK status as an error and aborts retries on non-retryable codes. The marine method cannot reuse it as-is because 400 must produce `null`, not throw. Two viable shapes:

- **Marine-specific fetch wrapper** that catches 400 inline before delegating to shared retry logic for 5xx/timeout. Preferred — keeps the "this provider is allowed to say no" semantics local to the marine method.
- **Catch-and-convert at the call site** — wrap the existing helper, intercept `WEATHER_PROVIDER_UNAVAILABLE` with the underlying status, convert if 400. Brittle because the status is buried in the error chain.

Implementation should use the first option. Refactoring `fetchJson` to take an optional `nonRetryableSuccessStatuses` set is over-engineering for one caller.

### Service-Layer Composition

`ranking.service.ts` orchestrates parallel fetches:

```ts
const [forecast, marine] = await Promise.all([
  weatherClient.getDailyForecast(location),
  weatherClient.getMarineForecast(location),
]);

const enriched = forecast.map((day) => ({
  ...day,
  marine: marine?.find((m) => m.date === day.date),
}));

return { location, days: rankActivities(enriched) };
```

Parallel fetches keep latency comparable to current single-fetch behavior. Date-matching is necessary because marine and forecast endpoints can return slightly different date ranges depending on timezone resolution.

### Scoring Function Update

`scoreSurfing` becomes:

```ts
export const scoreSurfing = (day: WeatherDay): ActivityScore => {
  if (!day.marine) {
    return {
      activity: "SURFING",
      score: 0,
      reason: "No coastal forecast available for this location.",
    };
  }

  const waveBonus = tier(day.marine.waveHeightMaxM, [
    { when: (h) => h >= 1 && h <= 2.5, points: 40 },
    { when: (h) => h >= 0.5 && h < 1, points: 20 },
    { when: (h) => h > 2.5 && h <= 4, points: 15 },
  ]);
  const periodBonus = day.marine.wavePeriodMaxS >= 8 ? 25 : 10;
  const warmthBonus = tier(day.temperatureMaxC, [
    { when: (t) => t >= 20, points: 15 },
    { when: (t) => t >= 15, points: 8 },
  ]);
  const stormPenalty = day.precipitationMm > 15 ? 20 : 0;

  return {
    activity: "SURFING",
    score: clampScore(20 + waveBonus + periodBonus + warmthBonus - stormPenalty),
    reason: "Scores higher with rideable wave height, longer period, and mild conditions.",
  };
};
```

Scoring weights (sweet-spot 1–2.5m wave height, 8s+ period) are based on common surf-condition heuristics and are documented in the `ScoringCriteriaDialog` as a follow-up. The exact numbers are less important than the data flow being correct.

## 3. Direct Unit Tests for Scoring

### Files

- `apps/backend/tests/unit/scoring.skiing.test.ts`
- `apps/backend/tests/unit/scoring.surfing.test.ts`
- `apps/backend/tests/unit/scoring.outdoorSightseeing.test.ts`
- `apps/backend/tests/unit/scoring.indoorSightseeing.test.ts`
- `apps/backend/tests/unit/tier.test.ts`

Existing `rankActivities.test.ts` stays as integration coverage for sort ordering.

### Coverage Per Scoring Function

Each test file covers:
- Happy path (typical-day input → expected score range and reason).
- Boundary conditions for each tier (e.g., `temperatureMaxC === 2` vs `=== 3` for skiing's cold bonus).
- Score clamping (extreme inputs produce 0–100 output).
- Reason string is non-empty and stable.

For surfing specifically:
- Without `day.marine`: returns `0` with the N/A reason, regardless of land weather.
- With `day.marine` in the sweet spot: returns the wave bonus.
- Edge: marine present but flat (waveHeight 0) returns minimum surfing score.

### Tier Helper Tests

- First matching rule wins (order-sensitive).
- No matching rule returns 0.
- Empty rules array returns 0.
- Predicates are pure (helper does not mutate input).

## 4. `tier()` Helper

### Location

`apps/backend/src/domain/ranking/tier.ts` — domain-specific abstraction; no other module needs it. Keeps `lib/` for cross-cutting utilities like the cache.

### Signature

```ts
type TierRule = { when: (value: number) => boolean; points: number };

export const tier = (value: number, rules: TierRule[]): number =>
  rules.find((rule) => rule.when(value))?.points ?? 0;
```

### Refactor of `scoring.ts`

Each `if/else` ternary chain in the scoring functions becomes a `tier()` call with declarative rules. Example:

```ts
// Before
const coldBonus = day.temperatureMaxC <= 2 ? 35 : day.temperatureMaxC <= 6 ? 20 : 0;

// After
const coldBonus = tier(day.temperatureMaxC, [
  { when: (t) => t <= 2, points: 35 },
  { when: (t) => t <= 6, points: 20 },
]);
```

The rules read like a table. Adding a new tier means adding a row, not nesting another ternary. This is the kind of small abstraction that signals senior judgment without over-engineering.

## 5. README Clarification

Add a "Runtime" subsection above "Run Locally":

> **Runtime:** The application targets Node.js 20+. Bun is used as the package manager and dev runner because it speeds up the install/test loop on this monorepo, but the produced JavaScript runs on Node. To use npm instead: replace `bun install` with `npm install`, `bun run` with `npm run`, and `bun --filter` with `npm --workspace`.

Also add a "Future Improvements" subsection listing the cache size cap, persistent cache layer (Redis), and CI workflow as deliberate omissions.

## Testing Strategy

| Layer | New tests |
|---|---|
| Unit (domain) | One file per scoring function (4) + `tier()` helper |
| Unit (lib) | `cache.test.ts` — get/set, TTL expiry, override TTL, missing key |
| Unit (client) | Marine API: 200 with data, 200 with empty arrays, 400 inland response, 5xx error mapping, cache hit on second call |
| Integration (service) | Service merges marine into forecast by date, parallel fetches, surfing scores 0 when marine is `null` |

Existing tests (graphql.test.ts, retry behavior, error masking) remain unchanged. Total new test count: ~25–30 assertions across ~7 new files.

## Backwards Compatibility

The GraphQL schema does not change. The shape of `WeatherDay` gains an optional field, but it is a backend-internal type — clients never see it. Existing tests that construct `WeatherDay` without `marine` continue to compile and pass.

## Out of Scope

- Persistent cache (Redis, memcached) — in-memory is sufficient for take-home scope.
- Cache size cap / LRU eviction — flagged as future work.
- Cache warming or pre-fetching popular cities.
- Marine API retry policy distinct from forecast — the existing `pRetry` wrapper is reused.
- UI surfacing of "this location has no surfing data" beyond the existing `reason` field — the score-0 row already carries that text.
- CI workflow.
- Coastline proximity heuristic (Option C from earlier discussion).
