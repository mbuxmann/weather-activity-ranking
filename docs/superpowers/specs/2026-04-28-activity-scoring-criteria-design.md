# Activity Scoring Criteria Design

## Goal

Replace the current additive bonus/penalty scoring with a small weighted-factor model so each activity declares which weather variables matter, how they map to a 0..1 factor score, and how heavily that factor weighs in the final 0-100 score. This makes the criteria reviewable, the factor functions independently testable, and the GraphQL `reason` field dynamic. The work is sized to fit a senior take-home: minimal new Open-Meteo fields, no new client, no schema change.

## Non-Goals

- Adding the Open-Meteo Marine API.
- Persisting snow depth, historical conditions, or any data outside the daily forecast.
- Changing the GraphQL contract (`activityRankings` query, `ActivityScore` shape).
- Frontend redesign beyond a band label next to the score.
- Tuning weights against real-world data.

## Open-Meteo Fields

Currently fetched: `temperature_2m_max`, `temperature_2m_min`, `precipitation_sum`, `snowfall_sum`, `wind_speed_10m_max`.

Add to the same daily endpoint (no new HTTP client, no second fetch):

- `apparent_temperature_max` - replaces dry-bulb temperature for comfort-driven activities. Open-Meteo derives it from temperature, humidity, wind, and radiation.
- `weather_code` - WMO code per day. Categorical "what kind of day" signal used by surfing, outdoor sightseeing, and indoor sightseeing.

Activate the already-fetched but unused `temperatureMinC` for skiing (overnight cold preserves the snowpack).

Deliberately not adding:

- `wind_gusts_10m_max` - mean wind speed is sufficient for the take-home. Adding gusts splits "wind" into two fields and forces every scorer to choose.
- `uv_index_max` - only outdoor sightseeing benefits, only at extremes.
- `snow_depth_max` - unreliable for arbitrary city centers.
- Marine API (`wave_height_max`, etc.) - documented in README as the largest single quality improvement deferred for budget reasons.

## Score Model

### Factor

```ts
type Factor<T> = {
  name: string;
  weight: number;
  score: (day: T) => number; // returns 0..1
};
```

Each activity declares an ordered list of factors. The activity score is:

```
weighted = Σ(weight_i × score_i(day)) / Σ(weight_i)   // in [0, 1]
score    = round(weighted × 100)                       // in [0, 100]
```

`score_i(day)` always returns a number in `[0, 1]`. Weights are positive integers. The existing `clampScore(value)` helper (clamps to `[0, 100]` and rounds) is reused for the final integer; intermediate factor outputs are clamped to `[0, 1]` inside `piecewise`.

`scoreActivity(activity, day)` is the single entry point used by `rankActivities.ts`. Internally it:

1. Evaluates each factor's `score(day)`.
2. Computes the weighted average and final integer score.
3. Calls `buildReason(scoredFactors)` to produce the human-readable reason.
4. Returns `{ activity, score, reason }`.

### Why weighted factors instead of additive bonus/penalty

The current model (`base + coldBonus + snowBonus - windPenalty`, then clamp) entangles weight, threshold, and base value into single bonus numbers like `+35`. A reviewer cannot tell whether `+35` means "this factor is dominant" or "this threshold happens to add 35". The weighted-factor model separates:

- **Weight** - how much this factor matters (explicit integer).
- **Curve** - how the variable maps to 0..1 (data, not procedural code).
- **Composition** - how factors combine (one shared formula).

Each `score` function is a pure 1-arg function (`day -> 0..1`) and is independently testable. Tuning the model is editing one anchor or one weight, not chasing a magic number.

### Piecewise-linear curves

Factor curves are piecewise-linear, declared as anchor points:

```ts
const piecewise = (anchors: Array<[number, number]>) => (input: number) => number;
```

Behavior:

- Anchors are sorted by `x` ascending (the helper sorts internally; callers may declare them in order).
- Below the first anchor, the result is the first anchor's `y`.
- Above the last anchor, the result is the last anchor's `y`.
- Between anchors, linear interpolation.
- The output is clamped to `[0, 1]` even if anchor `y` values fall outside that range (defensive).

Piecewise-linear is enough for monotonic curves (`snowfall`), hump curves (surfing wind sweet-spot), and valley curves (indoor sightseeing temperature extremes).

### Weather-code categories

`weather_code` values are WMO codes (numeric). A small helper maps codes to a closed enum so scorers do not duplicate the WMO table:

```ts
type WeatherCategory = "clear" | "cloud" | "fog" | "rain" | "heavyRain" | "snow" | "thunder";
weatherCategory(code: number): WeatherCategory
```

Mapping (covering Open-Meteo's documented codes):

| Code(s) | Category |
|---|---|
| 0 | clear |
| 1, 2, 3 | cloud |
| 45, 48 | fog |
| 51, 53, 55, 56, 57, 61, 63, 80, 81 | rain |
| 65, 82 | heavyRain |
| 71, 73, 75, 77, 85, 86 | snow |
| 95, 96, 99 | thunder |

Unknown codes default to `cloud` so scoring stays usable for unexpected provider values.

### Dynamic reason field

The existing GraphQL `ActivityScore.reason: String!` field is currently a static per-activity string. Replace it with a generated reason derived from the per-factor scores:

- Take the top factor by `weight × score` (call it `top`).
- Take the worst factor by `weight × (1 - score)` (call it `worst`).
- If `top.score >= 0.6` and `worst.score <= 0.4`: `"Strong on {top.name}; held back by {worst.name}."`
- Else if `top.score >= 0.6`: `"Strong on {top.name}."`
- Else if `worst.score <= 0.4`: `"Held back by {worst.name}."`
- Else: `"Mixed conditions across {top.name} and {worst.name}."`

Factor `name` values are user-readable phrases (e.g. `"snowfall"`, `"daytime cold"`, `"clear sky"`), not internal identifiers.

### Score band (frontend only)

A `scoreBand(score: number)` helper on the frontend maps the numeric score to a label for display only:

| Score range | Band |
|---|---|
| 80-100 | Excellent |
| 60-79 | Good |
| 40-59 | Fair |
| 20-39 | Poor |
| 0-19 | Unsuitable |

Bands live in a small frontend module. The GraphQL contract stays unchanged. Domain code remains purely numeric.

## Per-Activity Criteria

All curves below assume one weather day. `apparent` = `apparentTemperatureMaxC`, `tempMin` = `temperatureMinC`, `precip` = `precipitationMm`, `snow` = `snowfallCm`, `wind` = `windSpeedKph`, `code` = `weatherCode`.

### Skiing

Cold day with fresh snow and manageable wind.

| Factor (name) | Variable | Weight | Curve (anchors) | Notes |
|---|---|---|---|---|
| `snowfall` | `snow` | 4 | `(0, 0.0), (2, 0.4), (5, 0.7), (15, 1.0)` | Powder day signal |
| `daytime cold` | `apparent` | 3 | `(-10, 1.0), (-2, 1.0), (0, 0.7), (3, 0.3), (6, 0.0)` | Below freezing rewarded |
| `overnight cold` | `tempMin` | 2 | `(-15, 1.0), (-3, 1.0), (0, 0.6), (3, 0.2), (6, 0.0)` | Preserves snow base |
| `manageable wind` | `wind` | 1 | `(0, 1.0), (30, 1.0), (50, 0.5), (70, 0.0)` | High wind closes lifts |

### Surfing

Wind sweet-spot, no storm, comfortable enough to be in the water. No marine data.

| Factor | Variable | Weight | Curve | Notes |
|---|---|---|---|---|
| `usable wind` | `wind` | 3 | `(0, 0.3), (10, 0.7), (15, 1.0), (25, 1.0), (35, 0.4), (50, 0.0)` | Hump: light = glassy, heavy = blown out |
| `low storm risk` | `precip` | 2 | `(0, 1.0), (5, 0.8), (15, 0.4), (30, 0.0)` | |
| `comfort` | `apparent` | 1 | `(10, 0.0), (15, 0.4), (20, 0.8), (25, 1.0)` | Cold-water surf still possible at low scores |
| `no thunder` | `weatherCategory(code)` | 1 | `thunder -> 0.0, rain -> 0.6, fog -> 0.7, heavyRain -> 0.5, snow -> 0.5, clear -> 1.0, cloud -> 1.0` | Discrete |

### Outdoor sightseeing

Comfortable, dry, calm, sunny.

| Factor | Variable | Weight | Curve | Notes |
|---|---|---|---|---|
| `comfort` | `apparent` | 3 | `(5, 0.0), (12, 0.4), (18, 1.0), (26, 1.0), (30, 0.6), (35, 0.2)` | Hump centered on 18-26 C |
| `dryness` | `precip` | 3 | `(0, 1.0), (2, 0.8), (8, 0.4), (20, 0.0)` | |
| `sky quality` | `weatherCategory(code)` | 2 | `clear -> 1.0, cloud -> 0.9, fog -> 0.6, rain -> 0.4, heavyRain -> 0.2, snow -> 0.3, thunder -> 0.1` | Discrete |
| `calm wind` | `wind` | 1 | `(0, 1.0), (25, 1.0), (40, 0.5), (60, 0.0)` | |

### Indoor sightseeing

Inverse-of-outdoor in spirit, but its own model so it remains independently testable. Floors around 25-30 on perfect outdoor days (museums always exist), peaks near 100 on awful weather.

| Factor | Variable | Weight | Curve | Notes |
|---|---|---|---|---|
| `wet weather` | `precip` | 3 | `(0, 0.3), (5, 0.5), (12, 0.8), (25, 1.0)` | |
| `temp extremes` | `apparent` | 2 | `(-10, 1.0), (0, 0.8), (10, 0.4), (22, 0.2), (30, 0.6), (40, 1.0)` | Valley curve |
| `severe sky` | `weatherCategory(code)` | 2 | `clear -> 0.2, cloud -> 0.3, fog -> 0.5, rain -> 0.6, heavyRain -> 0.9, snow -> 0.8, thunder -> 1.0` | Discrete |
| `windy` | `wind` | 1 | `(0, 0.3), (25, 0.5), (40, 0.8), (60, 1.0)` | |

## Architecture Changes

```
apps/backend/src/
  domain/
    weather/
      types.ts              # WeatherDay gains apparentTemperatureMaxC, weatherCode
    ranking/
      factors.ts            # NEW. piecewise(), Factor type, scoreActivity()
      weatherCategory.ts    # NEW. weatherCategory(code)
      activities/
        skiing.ts           # NEW. Factor[] config + display name + reason
        surfing.ts          # NEW.
        outdoorSightseeing.ts  # NEW.
        indoorSightseeing.ts   # NEW.
      reason.ts             # NEW. buildReason(factors, day)
      rankActivities.ts     # Updated. Maps each activity config -> ActivityScore
      types.ts              # Unchanged.
      scoring.ts            # DELETED after migration. Replaced by activities/*.ts.
  clients/
    openMeteo.client.ts     # Adds two daily fields to URL + Zod schema.
apps/frontend/src/
  components/
    scoreBand.ts            # NEW. scoreBand(score) -> label
    ...                     # Existing component imports scoreBand for display.
```

`rankActivities.ts` becomes a thin loop over the four activity configs:

```ts
const activities = [skiing, surfing, outdoorSightseeing, indoorSightseeing];
const rankings = activities
  .map((activity) => scoreActivity(activity, day))
  .sort((a, b) => b.score - a.score);
```

The GraphQL resolver and ranking service are untouched. The `reason` field continues to flow through unchanged from a contract perspective; only its source changes.

## Testing Strategy

All new tests are colocated with their module under `*.test.ts` files (Vitest). Prefer table-driven cases over many small `it` blocks.

- `factors.test.ts`
  - `piecewise`: below first anchor, above last anchor, exact anchor, midpoint interpolation, empty/single anchor, output stays in `[0, 1]`.
  - `scoreActivity`: weighted average math (single factor, balanced factors, dominant factor), clamping, integer rounding, returns `Activity`, `score`, `reason`.
- `weatherCategory.test.ts`
  - All documented codes resolve to expected category. Unknown code defaults to `cloud`.
- `activities/*.test.ts` (one per activity, table-driven)
  - Ideal day produces score >= 80 (skiing, surfing, outdoor sightseeing).
  - Terrible day produces score <= 20 (skiing, surfing, outdoor sightseeing).
  - Indoor sightseeing inverts: ideal *outdoor* day produces a low indoor score (<= 35); awful outdoor day produces a high indoor score (>= 80).
  - Mid day produces score in 35-65.
  - Each factor is sampled at its key anchor `x` values (lowest declared, plateau edges, highest declared) to confirm it reads from the right `WeatherDay` field and tracks its curve.
- `reason.test.ts`
  - Strong + weak both present produces "Strong on X; held back by Y." form.
  - Strong only.
  - Weak only.
  - Mixed (no strong, no weak) form.
  - Names of `top` and `worst` come from the highest weighted-impact factors.
- `rankActivities.test.ts`
  - Returns one `DailyActivityRanking` per input day.
  - Each day contains all four activities.
  - Rankings are sorted descending by score.
- `ranking.service.test.ts`
  - Empty city raises `INVALID_CITY`.
  - Successful path: mocked client -> `getActivityRankings` returns `{ location, days }` with expected shape.
- GraphQL smoke test (existing or added) covers the full resolver path with a mocked client.
- Frontend `scoreBand.test.ts` covers each band edge.

The Open-Meteo client itself does not get new tests beyond what already exists; the schema additions are exercised by an existing client test if present, otherwise a small "schema parses fixture" test is added alongside the existing client tests.

## Trade-offs (to surface in README)

The README's existing "Trade-Offs" and "Omissions" sections are extended with:

- **Marine API not used.** Surfing would benefit most from `wave_height_max`, `wave_period_max`, and `swell_*` fields. Adding the Marine endpoint doubles the client surface for a single activity inside a 2-3 hour budget. The factor model is structured so a `MarineDay` could be combined with `WeatherDay` and the surfing config could pull from both without changes to the GraphQL or service layers.
- **No snow depth, no historical accumulation.** Skiing scores fresh snow plus cold rather than season-long pack quality. `snow_depth_max` exists in Open-Meteo but is unreliable for arbitrary city coordinates and conflates lift-served terrain with city centers.
- **No gusts, no UV.** Mean wind speed (`wind_speed_10m_max`) is used for both calm-loving and windy-loving factors. Gusts and UV add fields and tests for marginal score impact at extreme weather only.
- **Weights and curve anchors are heuristic.** They are concentrated in `domain/ranking/activities/*.ts` so a reviewer or product owner can adjust them without reading scoring code. There is no learned model.
- **Indoor sightseeing modelled independently.** It could be derived as `1 - outdoorScore`, but coupling activities makes each scorer harder to test and harder to reason about. The current model floors near 0.3 on perfect outdoor days, which is the right behavior for a ranked list.

## Out of Scope

- Tuning weights against any real dataset.
- Persisting daily forecasts.
- Adding additional activities.
- Localizing weather labels.
- Adding the band field to the GraphQL contract (frontend-only for now).
