# Scaling, Marine Forecast, and Scoring Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add TTL caching to the Open-Meteo client, integrate marine forecast data for surfing with honest "no coastal data" handling, add direct unit tests for each scoring function, refactor `scoring.ts` to use a small `tier()` helper, and clarify Bun-vs-Node in the README.

**Architecture:** Build the foundation pieces first (`tier` helper and `ttlCache` helper) with their own tests. Then add characterization tests for the existing scoring functions before refactoring them — the new tests provide a safety net. Then add the marine forecast type, client method, scoring update, and service-layer merge as a connected slice. Wire caching into the client last. README updates conclude.

**Tech Stack:** Bun, TypeScript, Hono, GraphQL Yoga, Vitest, Zod, p-retry. No new dependencies.

---

### Task 1: Add the `tier()` helper

**Files:**
- Create: `apps/backend/src/domain/ranking/tier.ts`
- Test: `apps/backend/tests/unit/tier.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/backend/tests/unit/tier.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { tier } from "../../src/domain/ranking/tier.js";

describe("tier", () => {
  it("returns the points of the first matching rule", () => {
    const points = tier(5, [
      { when: (v) => v <= 2, points: 35 },
      { when: (v) => v <= 6, points: 20 },
      { when: (v) => v <= 10, points: 10 }
    ]);

    expect(points).toBe(20);
  });

  it("returns 0 when no rule matches", () => {
    const points = tier(100, [
      { when: (v) => v < 0, points: 50 },
      { when: (v) => v < 10, points: 25 }
    ]);

    expect(points).toBe(0);
  });

  it("returns 0 for an empty rule list", () => {
    expect(tier(5, [])).toBe(0);
  });

  it("evaluates rules in order — earlier rules win on overlap", () => {
    const points = tier(1, [
      { when: () => true, points: 100 },
      { when: () => true, points: 50 }
    ]);

    expect(points).toBe(100);
  });

  it("does not mutate the rule list", () => {
    const rules = [{ when: (v: number) => v > 0, points: 5 }];
    const before = [...rules];

    tier(1, rules);

    expect(rules).toEqual(before);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun --filter backend test tests/unit/tier.test.ts`

Expected: FAIL with module-not-found for `tier`.

- [ ] **Step 3: Implement the helper**

Create `apps/backend/src/domain/ranking/tier.ts`:

```ts
export type TierRule = {
  when: (value: number) => boolean;
  points: number;
};

/**
 * Returns the `points` of the first rule whose predicate matches, or 0.
 * Used by scoring functions to express threshold-based bonuses as a
 * declarative table instead of nested ternaries.
 */
export const tier = (value: number, rules: TierRule[]): number =>
  rules.find((rule) => rule.when(value))?.points ?? 0;
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `bun --filter backend test tests/unit/tier.test.ts`

Expected: PASS — 5 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/domain/ranking/tier.ts apps/backend/tests/unit/tier.test.ts
git commit -m "feat(backend): add tier() helper for threshold-based scoring rules"
```

---

### Task 2: Add characterization tests for skiing, outdoor, and indoor scoring

This task locks in the existing behavior of three scoring functions before we refactor them. Surfing is intentionally skipped — its behavior is changing.

**Files:**
- Test: `apps/backend/tests/unit/scoring.skiing.test.ts`
- Test: `apps/backend/tests/unit/scoring.outdoorSightseeing.test.ts`
- Test: `apps/backend/tests/unit/scoring.indoorSightseeing.test.ts`

- [ ] **Step 1: Write skiing tests**

Create `apps/backend/tests/unit/scoring.skiing.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { scoreSkiing } from "../../src/domain/ranking/scoring.js";
import type { WeatherDay } from "../../src/domain/weather/types.js";

const baseDay = (overrides: Partial<WeatherDay> = {}): WeatherDay => ({
  date: "2026-04-28",
  temperatureMinC: -5,
  temperatureMaxC: 0,
  precipitationMm: 0,
  snowfallCm: 5,
  windSpeedKph: 10,
  ...overrides
});

describe("scoreSkiing", () => {
  it("returns the SKIING activity tag and a stable reason", () => {
    const result = scoreSkiing(baseDay());

    expect(result.activity).toBe("SKIING");
    expect(result.reason).toBe(
      "Scores higher with colder temperatures, snowfall, and manageable wind."
    );
  });

  it("rewards very cold days (≤ 2°C) with the full cold bonus", () => {
    const cold = scoreSkiing(baseDay({ temperatureMaxC: 2, snowfallCm: 0, windSpeedKph: 0 }));
    const milder = scoreSkiing(baseDay({ temperatureMaxC: 6, snowfallCm: 0, windSpeedKph: 0 }));
    const warm = scoreSkiing(baseDay({ temperatureMaxC: 10, snowfallCm: 0, windSpeedKph: 0 }));

    expect(cold.score).toBeGreaterThan(milder.score);
    expect(milder.score).toBeGreaterThan(warm.score);
  });

  it("rewards heavier snowfall up to a 45-point cap", () => {
    const noSnow = scoreSkiing(baseDay({ snowfallCm: 0 }));
    const lots = scoreSkiing(baseDay({ snowfallCm: 4 }));
    const enormous = scoreSkiing(baseDay({ snowfallCm: 100 }));

    expect(lots.score).toBeGreaterThan(noSnow.score);
    expect(enormous.score).toBe(lots.score < 100 ? lots.score : 100);
  });

  it("penalises high wind (> 35 kph)", () => {
    const calm = scoreSkiing(baseDay({ windSpeedKph: 30 }));
    const windy = scoreSkiing(baseDay({ windSpeedKph: 40 }));

    expect(calm.score).toBeGreaterThan(windy.score);
  });

  it("clamps the score to the 0–100 range", () => {
    const extreme = scoreSkiing(baseDay({ snowfallCm: 1000, temperatureMaxC: -50 }));
    const awful = scoreSkiing(baseDay({ snowfallCm: 0, temperatureMaxC: 40, windSpeedKph: 100 }));

    expect(extreme.score).toBeLessThanOrEqual(100);
    expect(awful.score).toBeGreaterThanOrEqual(0);
  });
});
```

- [ ] **Step 2: Write outdoor sightseeing tests**

Create `apps/backend/tests/unit/scoring.outdoorSightseeing.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { scoreOutdoorSightseeing } from "../../src/domain/ranking/scoring.js";
import type { WeatherDay } from "../../src/domain/weather/types.js";

const baseDay = (overrides: Partial<WeatherDay> = {}): WeatherDay => ({
  date: "2026-04-28",
  temperatureMinC: 14,
  temperatureMaxC: 22,
  precipitationMm: 0,
  snowfallCm: 0,
  windSpeedKph: 10,
  ...overrides
});

describe("scoreOutdoorSightseeing", () => {
  it("returns the OUTDOOR_SIGHTSEEING activity tag and a stable reason", () => {
    const result = scoreOutdoorSightseeing(baseDay());

    expect(result.activity).toBe("OUTDOOR_SIGHTSEEING");
    expect(result.reason).toBe(
      "Scores higher for comfortable, dry days with lower wind."
    );
  });

  it("rewards comfortable temperatures (16–28°C)", () => {
    const comfy = scoreOutdoorSightseeing(baseDay({ temperatureMaxC: 22 }));
    const chilly = scoreOutdoorSightseeing(baseDay({ temperatureMaxC: 10 }));
    const hot = scoreOutdoorSightseeing(baseDay({ temperatureMaxC: 35 }));

    expect(comfy.score).toBeGreaterThan(chilly.score);
    expect(comfy.score).toBeGreaterThan(hot.score);
  });

  it("rewards dry days, with a tiered bonus", () => {
    const dry = scoreOutdoorSightseeing(baseDay({ precipitationMm: 1 }));
    const damp = scoreOutdoorSightseeing(baseDay({ precipitationMm: 5 }));
    const wet = scoreOutdoorSightseeing(baseDay({ precipitationMm: 20 }));

    expect(dry.score).toBeGreaterThan(damp.score);
    expect(damp.score).toBeGreaterThan(wet.score);
  });

  it("penalises high wind (> 35 kph)", () => {
    const calm = scoreOutdoorSightseeing(baseDay({ windSpeedKph: 20 }));
    const windy = scoreOutdoorSightseeing(baseDay({ windSpeedKph: 40 }));

    expect(calm.score).toBeGreaterThan(windy.score);
  });

  it("clamps the score to 0–100", () => {
    const result = scoreOutdoorSightseeing(
      baseDay({ temperatureMaxC: 22, precipitationMm: 0, windSpeedKph: 0 })
    );

    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.score).toBeGreaterThanOrEqual(0);
  });
});
```

- [ ] **Step 3: Write indoor sightseeing tests**

Create `apps/backend/tests/unit/scoring.indoorSightseeing.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { scoreIndoorSightseeing } from "../../src/domain/ranking/scoring.js";
import type { WeatherDay } from "../../src/domain/weather/types.js";

const baseDay = (overrides: Partial<WeatherDay> = {}): WeatherDay => ({
  date: "2026-04-28",
  temperatureMinC: 18,
  temperatureMaxC: 25,
  precipitationMm: 0,
  snowfallCm: 0,
  windSpeedKph: 10,
  ...overrides
});

describe("scoreIndoorSightseeing", () => {
  it("returns the INDOOR_SIGHTSEEING activity tag and a stable reason", () => {
    const result = scoreIndoorSightseeing(baseDay());

    expect(result.activity).toBe("INDOOR_SIGHTSEEING");
    expect(result.reason).toBe(
      "Scores higher when outdoor conditions are less comfortable."
    );
  });

  it("rewards rainy days", () => {
    const dry = scoreIndoorSightseeing(baseDay({ precipitationMm: 0 }));
    const rainy = scoreIndoorSightseeing(baseDay({ precipitationMm: 12 }));

    expect(rainy.score).toBeGreaterThan(dry.score);
  });

  it("rewards windy days when there's no rain", () => {
    const calm = scoreIndoorSightseeing(baseDay({ precipitationMm: 0, windSpeedKph: 5 }));
    const windy = scoreIndoorSightseeing(baseDay({ precipitationMm: 0, windSpeedKph: 40 }));

    expect(windy.score).toBeGreaterThan(calm.score);
  });

  it("rewards uncomfortably cold or hot temperatures", () => {
    const comfortable = scoreIndoorSightseeing(baseDay({ temperatureMaxC: 22 }));
    const freezing = scoreIndoorSightseeing(baseDay({ temperatureMaxC: 5 }));
    const sweltering = scoreIndoorSightseeing(baseDay({ temperatureMaxC: 35 }));

    expect(freezing.score).toBeGreaterThan(comfortable.score);
    expect(sweltering.score).toBeGreaterThan(comfortable.score);
  });

  it("clamps the score to 0–100", () => {
    const result = scoreIndoorSightseeing(
      baseDay({ precipitationMm: 100, windSpeedKph: 100, temperatureMaxC: -50 })
    );

    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.score).toBeGreaterThanOrEqual(0);
  });
});
```

- [ ] **Step 4: Run all three test files to verify they pass**

Run: `bun --filter backend test tests/unit/scoring.skiing.test.ts tests/unit/scoring.outdoorSightseeing.test.ts tests/unit/scoring.indoorSightseeing.test.ts`

Expected: PASS — 15 tests across 3 files.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/tests/unit/scoring.skiing.test.ts apps/backend/tests/unit/scoring.outdoorSightseeing.test.ts apps/backend/tests/unit/scoring.indoorSightseeing.test.ts
git commit -m "test(backend): add direct unit tests for skiing, outdoor, indoor scoring"
```

---

### Task 3: Refactor `scoring.ts` to use `tier()` (skiing, outdoor, indoor only)

**Files:**
- Modify: `apps/backend/src/domain/ranking/scoring.ts`

The refactor must preserve existing scores exactly. The unit tests from Task 2 and the existing `rankActivities.test.ts` provide the safety net.

- [ ] **Step 1: Apply the refactor**

Replace `apps/backend/src/domain/ranking/scoring.ts` with:

```ts
import type { ActivityScore } from "./types.js";
import type { WeatherDay } from "../weather/types.js";
import { tier } from "./tier.js";

const clampScore = (value: number): number => Math.max(0, Math.min(100, Math.round(value)));

export const scoreSkiing = (day: WeatherDay): ActivityScore => {
  const coldBonus = tier(day.temperatureMaxC, [
    { when: (t) => t <= 2, points: 35 },
    { when: (t) => t <= 6, points: 20 }
  ]);
  const snowBonus = Math.min(45, day.snowfallCm * 12);
  const windPenalty = day.windSpeedKph > 35 ? 20 : 0;

  return {
    activity: "SKIING",
    score: clampScore(20 + coldBonus + snowBonus - windPenalty),
    reason: "Scores higher with colder temperatures, snowfall, and manageable wind."
  };
};

export const scoreSurfing = (day: WeatherDay): ActivityScore => {
  // NOTE: surfing scoring is intentionally untouched in this task.
  // It will be rewritten in Task 6 to use marine forecast data.
  const warmthBonus = day.temperatureMaxC >= 20 ? 25 : day.temperatureMaxC >= 15 ? 12 : 0;
  const windBonus = day.windSpeedKph >= 12 && day.windSpeedKph <= 30 ? 25 : 5;
  const stormPenalty = day.precipitationMm > 15 ? 25 : 0;

  return {
    activity: "SURFING",
    score: clampScore(25 + warmthBonus + windBonus - stormPenalty),
    reason: "Initial heuristic uses warm weather, usable wind, and low storm risk."
  };
};

export const scoreOutdoorSightseeing = (day: WeatherDay): ActivityScore => {
  const comfortBonus = tier(day.temperatureMaxC, [
    { when: (t) => t >= 16 && t <= 28, points: 35 }
  ]) || 15;
  const dryBonus = tier(day.precipitationMm, [
    { when: (p) => p <= 2, points: 30 },
    { when: (p) => p <= 8, points: 15 }
  ]);
  const windPenalty = day.windSpeedKph > 35 ? 15 : 0;

  return {
    activity: "OUTDOOR_SIGHTSEEING",
    score: clampScore(25 + comfortBonus + dryBonus - windPenalty),
    reason: "Scores higher for comfortable, dry days with lower wind."
  };
};

export const scoreIndoorSightseeing = (day: WeatherDay): ActivityScore => {
  const poorWeatherBonus = tier(day.precipitationMm, [
    { when: (p) => p > 8, points: 35 }
  ]) || (day.windSpeedKph > 35 ? 20 : 0);
  const uncomfortableTempBonus = tier(day.temperatureMaxC, [
    { when: (t) => t < 10 || t > 32, points: 20 }
  ]);

  return {
    activity: "INDOOR_SIGHTSEEING",
    score: clampScore(35 + poorWeatherBonus + uncomfortableTempBonus),
    reason: "Scores higher when outdoor conditions are less comfortable."
  };
};
```

Note on `comfortBonus` and `poorWeatherBonus`: the original code used `?` ternaries with a non-zero "else" branch. The `tier(...) || fallback` pattern preserves that exactly when all rules fail to match (tier returns 0, falsy, fallback wins). For `poorWeatherBonus` the original logic was "rain bonus, else wind bonus, else 0" — the `tier(...) || (windy ? 20 : 0)` form preserves precedence.

- [ ] **Step 2: Run the entire backend test suite to verify nothing regressed**

Run: `bun --filter backend test`

Expected: PASS — all backend tests including the 5 from Task 1, 15 from Task 2, the original `rankActivities.test.ts`, and the existing client/service/api tests (10 + new 15 + 5 = 30+ in total).

- [ ] **Step 3: Commit**

```bash
git add apps/backend/src/domain/ranking/scoring.ts
git commit -m "refactor(backend): express scoring thresholds with tier() helper"
```

---

### Task 4: Add the TTL cache helper

**Files:**
- Create: `apps/backend/src/lib/cache.ts`
- Test: `apps/backend/tests/unit/cache.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `apps/backend/tests/unit/cache.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTtlCache } from "../../src/lib/cache.js";

describe("createTtlCache", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns undefined for missing keys", () => {
    const cache = createTtlCache<string>(1000);

    expect(cache.get("nope")).toBeUndefined();
  });

  it("returns stored values within their TTL", () => {
    const cache = createTtlCache<string>(1000);
    cache.set("k", "v");

    expect(cache.get("k")).toBe("v");
  });

  it("expires values after the default TTL", () => {
    const cache = createTtlCache<string>(1000);
    cache.set("k", "v");

    vi.advanceTimersByTime(999);
    expect(cache.get("k")).toBe("v");

    vi.advanceTimersByTime(2);
    expect(cache.get("k")).toBeUndefined();
  });

  it("respects a per-set TTL override", () => {
    const cache = createTtlCache<string>(1000);
    cache.set("k", "v", 5000);

    vi.advanceTimersByTime(4000);
    expect(cache.get("k")).toBe("v");

    vi.advanceTimersByTime(1500);
    expect(cache.get("k")).toBeUndefined();
  });

  it("can store nullish values distinctly from missing keys", () => {
    const cache = createTtlCache<string | null>(1000);
    cache.set("k", null);

    expect(cache.get("k")).toBeNull();
    expect(cache.get("missing")).toBeUndefined();
  });

  it("overwrites the value and resets the expiry on re-set", () => {
    const cache = createTtlCache<string>(1000);
    cache.set("k", "first");

    vi.advanceTimersByTime(800);
    cache.set("k", "second");

    vi.advanceTimersByTime(800);
    expect(cache.get("k")).toBe("second");

    vi.advanceTimersByTime(300);
    expect(cache.get("k")).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun --filter backend test tests/unit/cache.test.ts`

Expected: FAIL with module-not-found for `cache`.

- [ ] **Step 3: Implement the helper**

Create `apps/backend/src/lib/cache.ts`:

```ts
type Entry<T> = {
  value: T;
  expiresAt: number;
};

export type TtlCache<T> = {
  get(key: string): T | undefined;
  set(key: string, value: T, ttlOverrideMs?: number): void;
};

/**
 * Lightweight in-memory TTL cache with lazy eviction.
 *
 * Lazy eviction means expired entries are removed only when they are next
 * accessed. There is no background timer. This keeps the helper free of
 * lifecycle concerns (no `dispose` call site needed) and is appropriate
 * for this app's small key space.
 *
 * `set()` accepts an optional `ttlOverrideMs` so a single cache instance
 * can hold values with different freshness windows — used by the marine
 * cache to keep `null` (this-location-has-no-coast) for longer than data.
 */
export const createTtlCache = <T>(defaultTtlMs: number): TtlCache<T> => {
  const store = new Map<string, Entry<T>>();

  return {
    get(key) {
      const entry = store.get(key);

      if (!entry) {
        return undefined;
      }

      if (entry.expiresAt <= Date.now()) {
        store.delete(key);
        return undefined;
      }

      return entry.value;
    },

    set(key, value, ttlOverrideMs) {
      const ttl = ttlOverrideMs ?? defaultTtlMs;
      store.set(key, {
        value,
        expiresAt: Date.now() + ttl
      });
    }
  };
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `bun --filter backend test tests/unit/cache.test.ts`

Expected: PASS — 6 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/lib/cache.ts apps/backend/tests/unit/cache.test.ts
git commit -m "feat(backend): add TTL cache helper with lazy eviction"
```

---

### Task 5: Add the `MarineDay` type and extend `WeatherDay`

**Files:**
- Modify: `apps/backend/src/domain/weather/types.ts`

This is a type-only change. No tests or commits yet — it lays the groundwork for Task 6.

- [ ] **Step 1: Read the current file**

Read `apps/backend/src/domain/weather/types.ts` to confirm the existing shape.

- [ ] **Step 2: Update the file**

Replace `apps/backend/src/domain/weather/types.ts` with:

```ts
export type Location = {
  name: string;
  country: string;
  latitude: number;
  longitude: number;
};

export type MarineDay = {
  date: string;
  waveHeightMaxM: number;
  wavePeriodMaxS: number;
  windWaveHeightMaxM: number;
};

export type WeatherDay = {
  date: string;
  temperatureMinC: number;
  temperatureMaxC: number;
  precipitationMm: number;
  snowfallCm: number;
  windSpeedKph: number;
  /**
   * Marine forecast for this day, when the location has coastal data.
   * Absent means landlocked, marine API outage, or non-coastal station —
   * surfing should score 0 with a "no coastal forecast" reason.
   */
  marine?: MarineDay;
};
```

- [ ] **Step 3: Run typecheck to verify the change is safe**

Run: `bun run typecheck`

Expected: PASS — no consumer breaks because `marine` is optional.

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/domain/weather/types.ts
git commit -m "feat(backend): add MarineDay type and optional marine field on WeatherDay"
```

---

### Task 6: Update `scoreSurfing` for marine-aware scoring

**Files:**
- Modify: `apps/backend/src/domain/ranking/scoring.ts`
- Test: `apps/backend/tests/unit/scoring.surfing.test.ts`
- Modify: `apps/backend/tests/unit/rankActivities.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `apps/backend/tests/unit/scoring.surfing.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { scoreSurfing } from "../../src/domain/ranking/scoring.js";
import type { MarineDay, WeatherDay } from "../../src/domain/weather/types.js";

const landDay = (overrides: Partial<WeatherDay> = {}): WeatherDay => ({
  date: "2026-04-28",
  temperatureMinC: 16,
  temperatureMaxC: 22,
  precipitationMm: 0,
  snowfallCm: 0,
  windSpeedKph: 15,
  ...overrides
});

const marineDay = (overrides: Partial<MarineDay> = {}): MarineDay => ({
  date: "2026-04-28",
  waveHeightMaxM: 1.5,
  wavePeriodMaxS: 9,
  windWaveHeightMaxM: 0.8,
  ...overrides
});

const dayWithMarine = (
  weather: Partial<WeatherDay> = {},
  marine: Partial<MarineDay> = {}
): WeatherDay => ({
  ...landDay(weather),
  marine: marineDay(marine)
});

describe("scoreSurfing", () => {
  describe("when marine data is unavailable", () => {
    it("returns score 0 regardless of land weather", () => {
      const result = scoreSurfing(landDay({ temperatureMaxC: 28, windSpeedKph: 15 }));

      expect(result.activity).toBe("SURFING");
      expect(result.score).toBe(0);
    });

    it("returns the no-coastal-forecast reason", () => {
      const result = scoreSurfing(landDay());

      expect(result.reason).toBe(
        "No coastal forecast available for this location."
      );
    });
  });

  describe("when marine data is present", () => {
    it("rewards waves in the 1–2.5m sweet spot", () => {
      const sweet = scoreSurfing(dayWithMarine({}, { waveHeightMaxM: 1.5 }));
      const flat = scoreSurfing(dayWithMarine({}, { waveHeightMaxM: 0.2 }));
      const huge = scoreSurfing(dayWithMarine({}, { waveHeightMaxM: 6 }));

      expect(sweet.score).toBeGreaterThan(flat.score);
      expect(sweet.score).toBeGreaterThan(huge.score);
    });

    it("rewards longer wave period (>= 8s)", () => {
      const longPeriod = scoreSurfing(dayWithMarine({}, { wavePeriodMaxS: 10 }));
      const shortPeriod = scoreSurfing(dayWithMarine({}, { wavePeriodMaxS: 5 }));

      expect(longPeriod.score).toBeGreaterThan(shortPeriod.score);
    });

    it("rewards mild surface temperatures (>= 15°C)", () => {
      const warm = scoreSurfing(dayWithMarine({ temperatureMaxC: 22 }, {}));
      const chilly = scoreSurfing(dayWithMarine({ temperatureMaxC: 8 }, {}));

      expect(warm.score).toBeGreaterThan(chilly.score);
    });

    it("penalises stormy conditions (precipitation > 15mm)", () => {
      const calm = scoreSurfing(dayWithMarine({ precipitationMm: 1 }, {}));
      const stormy = scoreSurfing(dayWithMarine({ precipitationMm: 25 }, {}));

      expect(calm.score).toBeGreaterThan(stormy.score);
    });

    it("uses the rideable-conditions reason when marine data is present", () => {
      const result = scoreSurfing(dayWithMarine());

      expect(result.reason).toBe(
        "Scores higher with rideable wave height, longer period, and mild conditions."
      );
    });

    it("clamps the score to 0–100", () => {
      const peak = scoreSurfing(
        dayWithMarine({ temperatureMaxC: 25, precipitationMm: 0 }, { waveHeightMaxM: 2, wavePeriodMaxS: 12 })
      );

      expect(peak.score).toBeLessThanOrEqual(100);
      expect(peak.score).toBeGreaterThanOrEqual(0);
    });
  });
});
```

- [ ] **Step 2: Run the new test file to verify it fails**

Run: `bun --filter backend test tests/unit/scoring.surfing.test.ts`

Expected: FAIL — current `scoreSurfing` does not handle the marine field and uses a different reason string.

- [ ] **Step 3: Update the existing `rankActivities` test for the new scoring**

The existing test in `apps/backend/tests/unit/rankActivities.test.ts` asserts an exact score breakdown including SURFING: 55. After the next step it will score 0 because no marine data is provided in that fixture. Update the assertion now so the suite goes red→green cleanly when `scoreSurfing` is rewritten in Step 4.

Replace the entire file contents with:

```ts
import { describe, expect, it } from "vitest";
import { rankActivities } from "../../src/domain/ranking/rankActivities.js";
import type { WeatherDay } from "../../src/domain/weather/types.js";

describe("rankActivities", () => {
  it("returns all supported activities sorted by descending score", () => {
    const days: WeatherDay[] = [
      {
        date: "2026-04-28",
        temperatureMinC: 12,
        temperatureMaxC: 22,
        precipitationMm: 0,
        snowfallCm: 0,
        windSpeedKph: 10
      }
    ];

    const [ranking] = rankActivities(days);

    expect(ranking?.date).toBe("2026-04-28");
    expect(ranking?.rankings).toHaveLength(4);
    // Surfing scores 0 here because no marine data is attached — by design.
    // The first three ordering reflects activity-specific land-weather scoring.
    expect(ranking?.rankings[0]?.activity).toBe("OUTDOOR_SIGHTSEEING");
    expect(ranking?.rankings[ranking.rankings.length - 1]?.activity).toBe("SURFING");
    expect(ranking?.rankings[ranking.rankings.length - 1]?.score).toBe(0);
  });

  it("ranks surfing high when marine data is present and conditions are good", () => {
    const days: WeatherDay[] = [
      {
        date: "2026-04-28",
        temperatureMinC: 18,
        temperatureMaxC: 22,
        precipitationMm: 0,
        snowfallCm: 0,
        windSpeedKph: 15,
        marine: {
          date: "2026-04-28",
          waveHeightMaxM: 1.5,
          wavePeriodMaxS: 10,
          windWaveHeightMaxM: 0.8
        }
      }
    ];

    const [ranking] = rankActivities(days);
    const surfing = ranking?.rankings.find((r) => r.activity === "SURFING");

    expect(surfing?.score).toBeGreaterThan(50);
  });
});
```

- [ ] **Step 4: Update `scoreSurfing` in `scoring.ts`**

Open `apps/backend/src/domain/ranking/scoring.ts` and replace the entire `scoreSurfing` function with:

```ts
export const scoreSurfing = (day: WeatherDay): ActivityScore => {
  if (!day.marine) {
    return {
      activity: "SURFING",
      score: 0,
      reason: "No coastal forecast available for this location."
    };
  }

  const waveBonus = tier(day.marine.waveHeightMaxM, [
    { when: (h) => h >= 1 && h <= 2.5, points: 40 },
    { when: (h) => h >= 0.5 && h < 1, points: 20 },
    { when: (h) => h > 2.5 && h <= 4, points: 15 }
  ]);
  const periodBonus = day.marine.wavePeriodMaxS >= 8 ? 25 : 10;
  const warmthBonus = tier(day.temperatureMaxC, [
    { when: (t) => t >= 20, points: 15 },
    { when: (t) => t >= 15, points: 8 }
  ]);
  const stormPenalty = day.precipitationMm > 15 ? 20 : 0;

  return {
    activity: "SURFING",
    score: clampScore(20 + waveBonus + periodBonus + warmthBonus - stormPenalty),
    reason: "Scores higher with rideable wave height, longer period, and mild conditions."
  };
};
```

- [ ] **Step 5: Run the entire backend test suite to verify everything passes**

Run: `bun --filter backend test`

Expected: PASS — surfing tests new + updated `rankActivities` tests + all prior tests.

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/domain/ranking/scoring.ts apps/backend/tests/unit/scoring.surfing.test.ts apps/backend/tests/unit/rankActivities.test.ts
git commit -m "feat(backend): score surfing from marine wave data with N/A fallback"
```

---

### Task 7: Add `getMarineForecast` to the Open-Meteo client

**Files:**
- Modify: `apps/backend/src/clients/openMeteo.client.ts`
- Modify: `apps/backend/tests/unit/openMeteo.client.test.ts`

- [ ] **Step 1: Add failing tests for the marine method**

Open `apps/backend/tests/unit/openMeteo.client.test.ts` and append the following describe block at the end of the file (before the final closing brace of the outer `describe`, just below the existing tests):

```ts
  describe("marine forecast", () => {
    const coastalLocation = {
      name: "Lisbon",
      country: "Portugal",
      latitude: 38.72,
      longitude: -9.14
    };

    it("returns parsed marine days when the provider responds with data", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        jsonResponse({
          daily: {
            time: ["2026-04-28"],
            wave_height_max: [1.4],
            wave_period_max: [9.5],
            wind_wave_height_max: [0.7]
          }
        })
      );

      await expect(
        createOpenMeteoClient().getMarineForecast(coastalLocation)
      ).resolves.toEqual([
        {
          date: "2026-04-28",
          waveHeightMaxM: 1.4,
          wavePeriodMaxS: 9.5,
          windWaveHeightMaxM: 0.7
        }
      ]);
    });

    it("returns null when the provider responds with empty daily arrays", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        jsonResponse({
          daily: {
            time: [],
            wave_height_max: [],
            wave_period_max: [],
            wind_wave_height_max: []
          }
        })
      );

      await expect(
        createOpenMeteoClient().getMarineForecast(coastalLocation)
      ).resolves.toBeNull();
    });

    it("returns null when the provider responds with HTTP 400 (inland location)", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify({ error: true, reason: "no marine data" }), {
          status: 400,
          headers: { "content-type": "application/json" }
        })
      );

      await expect(
        createOpenMeteoClient().getMarineForecast({
          name: "Denver",
          country: "USA",
          latitude: 39.74,
          longitude: -104.99
        })
      ).resolves.toBeNull();
    });

    it("throws WEATHER_PROVIDER_UNAVAILABLE on 5xx after retries", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response("upstream is down", { status: 503 })
      );

      await expect(
        createOpenMeteoClient().getMarineForecast(coastalLocation)
      ).rejects.toMatchObject({
        code: "WEATHER_PROVIDER_UNAVAILABLE"
      });
    });

    it("throws WEATHER_PROVIDER_BAD_RESPONSE on schema mismatch", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        jsonResponse({ daily: { time: ["2026-04-28"] } })
      );

      await expect(
        createOpenMeteoClient().getMarineForecast(coastalLocation)
      ).rejects.toMatchObject({
        code: "WEATHER_PROVIDER_BAD_RESPONSE"
      });
    });
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `bun --filter backend test tests/unit/openMeteo.client.test.ts`

Expected: FAIL — `getMarineForecast` does not exist on the client.

- [ ] **Step 3: Implement `getMarineForecast`**

Edit `apps/backend/src/clients/openMeteo.client.ts`. Add the marine schema near the existing schemas (top of file):

```ts
const marineSchema = z.object({
  daily: z.object({
    time: z.array(z.string()),
    wave_height_max: z.array(z.number()),
    wave_period_max: z.array(z.number()),
    wind_wave_height_max: z.array(z.number())
  })
});
```

Update the imports at the top to include `MarineDay`:

```ts
import type { Location, MarineDay, WeatherDay } from "../domain/weather/types.js";
```

Update the `OpenMeteoClient` type to include the new method:

```ts
export type OpenMeteoClient = {
  searchLocation(city: string): Promise<Location>;
  getDailyForecast(location: Location): Promise<WeatherDay[]>;
  getMarineForecast(location: Location): Promise<MarineDay[] | null>;
};
```

Add a marine-specific fetch helper below `parseJsonResponse`:

```ts
/**
 * Fetches the marine API and treats HTTP 400 as a "no coastal data" signal
 * (returning `null`) rather than an error. The standard `fetchJson` helper
 * cannot be used because it throws on any non-OK status. 5xx and timeouts
 * still go through the retry path via `pRetry`.
 */
const fetchMarineJson = async (url: URL): Promise<unknown | null> => {
  try {
    const response = await pRetry(
      async () => {
        const result = await fetch(url, {
          signal: AbortSignal.timeout(5000)
        });

        if (result.status === 400) {
          // Business outcome: location has no coastal forecast.
          return null;
        }

        if (!result.ok) {
          const error = weatherProviderUnavailableError(
            new Error(`Open-Meteo marine request failed with ${result.status}`)
          );

          if (!isRetryableStatus(result.status)) {
            throw new AbortError(error);
          }

          throw error;
        }

        return result;
      },
      {
        factor: 2,
        minTimeout: 25,
        retries: 2
      }
    );

    if (response === null) {
      return null;
    }

    return await parseJsonResponse(response);
  } catch (error) {
    if (isAppError(error)) {
      throw error;
    }

    throw weatherProviderUnavailableError(error);
  }
};
```

Add the method inside the `createOpenMeteoClient` factory's returned object, after `getDailyForecast`:

```ts
  async getMarineForecast(location) {
    const url = new URL("https://marine-api.open-meteo.com/v1/marine");
    url.searchParams.set("latitude", String(location.latitude));
    url.searchParams.set("longitude", String(location.longitude));
    url.searchParams.set(
      "daily",
      ["wave_height_max", "wave_period_max", "wind_wave_height_max"].join(",")
    );
    url.searchParams.set("forecast_days", String(FORECAST_DAYS));
    url.searchParams.set("timezone", "auto");

    const raw = await fetchMarineJson(url);

    if (raw === null) {
      return null;
    }

    const payload = parseProviderPayload(marineSchema, raw);

    if (payload.daily.time.length === 0) {
      return null;
    }

    return payload.daily.time.map((date, index) => ({
      date,
      waveHeightMaxM: payload.daily.wave_height_max[index] ?? 0,
      wavePeriodMaxS: payload.daily.wave_period_max[index] ?? 0,
      windWaveHeightMaxM: payload.daily.wind_wave_height_max[index] ?? 0
    }));
  }
```

- [ ] **Step 4: Run the client test file to verify it passes**

Run: `bun --filter backend test tests/unit/openMeteo.client.test.ts`

Expected: PASS — original 4 tests + 5 new marine tests.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/clients/openMeteo.client.ts apps/backend/tests/unit/openMeteo.client.test.ts
git commit -m "feat(backend): add marine forecast client with 400-as-null inland handling"
```

---

### Task 8: Wire marine data into the ranking service

**Files:**
- Modify: `apps/backend/src/services/ranking.service.ts`
- Modify: `apps/backend/tests/integration/ranking.service.test.ts`

- [ ] **Step 1: Add a failing test for the marine merge**

Open `apps/backend/tests/integration/ranking.service.test.ts` and replace the entire file contents with:

```ts
import { describe, expect, it } from "vitest";
import { AppError } from "../../src/lib/errors.js";
import { createRankingService } from "../../src/services/ranking.service.js";

describe("ranking service", () => {
  const location = {
    name: "Cape Town",
    country: "South Africa",
    latitude: -33.92,
    longitude: 18.42
  };

  it("orchestrates location, forecast, and marine lookups in parallel", async () => {
    const service = createRankingService({
      async searchLocation(city) {
        expect(city).toBe("Cape Town");
        return location;
      },
      async getDailyForecast(receivedLocation) {
        expect(receivedLocation).toEqual(location);
        return [
          {
            date: "2026-04-28",
            temperatureMinC: 14,
            temperatureMaxC: 24,
            precipitationMm: 1,
            snowfallCm: 0,
            windSpeedKph: 16
          }
        ];
      },
      async getMarineForecast(receivedLocation) {
        expect(receivedLocation).toEqual(location);
        return [
          {
            date: "2026-04-28",
            waveHeightMaxM: 1.5,
            wavePeriodMaxS: 10,
            windWaveHeightMaxM: 0.7
          }
        ];
      }
    });

    const result = await service.getActivityRankings(" Cape Town ");

    expect(result.location).toEqual(location);
    expect(result.days).toHaveLength(1);
    const surfing = result.days[0]?.rankings.find((r) => r.activity === "SURFING");
    expect(surfing?.score).toBeGreaterThan(0);
  });

  it("scores surfing 0 when the marine forecast is null (landlocked location)", async () => {
    const service = createRankingService({
      async searchLocation() {
        return location;
      },
      async getDailyForecast() {
        return [
          {
            date: "2026-04-28",
            temperatureMinC: 14,
            temperatureMaxC: 24,
            precipitationMm: 1,
            snowfallCm: 0,
            windSpeedKph: 16
          }
        ];
      },
      async getMarineForecast() {
        return null;
      }
    });

    const result = await service.getActivityRankings("Denver");
    const surfing = result.days[0]?.rankings.find((r) => r.activity === "SURFING");

    expect(surfing?.score).toBe(0);
    expect(surfing?.reason).toBe(
      "No coastal forecast available for this location."
    );
  });

  it("merges marine days into forecast days by date", async () => {
    const service = createRankingService({
      async searchLocation() {
        return location;
      },
      async getDailyForecast() {
        return [
          {
            date: "2026-04-28",
            temperatureMinC: 14,
            temperatureMaxC: 24,
            precipitationMm: 0,
            snowfallCm: 0,
            windSpeedKph: 10
          },
          {
            date: "2026-04-29",
            temperatureMinC: 14,
            temperatureMaxC: 24,
            precipitationMm: 0,
            snowfallCm: 0,
            windSpeedKph: 10
          }
        ];
      },
      async getMarineForecast() {
        // Only the second day has marine data — the first should fall back to score 0.
        return [
          {
            date: "2026-04-29",
            waveHeightMaxM: 1.5,
            wavePeriodMaxS: 10,
            windWaveHeightMaxM: 0.7
          }
        ];
      }
    });

    const result = await service.getActivityRankings("Cape Town");

    const day1Surfing = result.days[0]?.rankings.find((r) => r.activity === "SURFING");
    const day2Surfing = result.days[1]?.rankings.find((r) => r.activity === "SURFING");

    expect(day1Surfing?.score).toBe(0);
    expect(day2Surfing?.score).toBeGreaterThan(0);
  });

  it("rejects empty city input with an INVALID_CITY app error", async () => {
    const service = createRankingService({
      async searchLocation() {
        throw new Error("searchLocation should not be called");
      },
      async getDailyForecast() {
        throw new Error("getDailyForecast should not be called");
      },
      async getMarineForecast() {
        throw new Error("getMarineForecast should not be called");
      }
    });

    await expect(service.getActivityRankings("   ")).rejects.toMatchObject({
      code: "INVALID_CITY"
    });
    await expect(service.getActivityRankings("   ")).rejects.toBeInstanceOf(AppError);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun --filter backend test tests/integration/ranking.service.test.ts`

Expected: FAIL — the service does not yet call `getMarineForecast` and the test fixture's mock client now requires that method.

- [ ] **Step 3: Update the service**

Replace the entire contents of `apps/backend/src/services/ranking.service.ts` with:

```ts
import { createOpenMeteoClient, type OpenMeteoClient } from "../clients/openMeteo.client.js";
import { rankActivities } from "../domain/ranking/rankActivities.js";
import type { DailyActivityRanking } from "../domain/ranking/types.js";
import type { Location, MarineDay, WeatherDay } from "../domain/weather/types.js";
import { invalidCityError } from "../lib/errors.js";

export type ActivityRankingResult = {
  location: Location;
  days: DailyActivityRanking[];
};

export type RankingService = {
  getActivityRankings(city: string): Promise<ActivityRankingResult>;
};

const mergeMarineByDate = (
  forecast: WeatherDay[],
  marine: MarineDay[] | null
): WeatherDay[] => {
  if (!marine) {
    return forecast;
  }

  const marineByDate = new Map(marine.map((day) => [day.date, day]));

  return forecast.map((day) => {
    const matching = marineByDate.get(day.date);
    return matching ? { ...day, marine: matching } : day;
  });
};

export const createRankingService = (
  weatherClient: OpenMeteoClient = createOpenMeteoClient()
): RankingService => ({
  async getActivityRankings(city) {
    const normalizedCity = city.trim();

    if (!normalizedCity) {
      throw invalidCityError();
    }

    const location = await weatherClient.searchLocation(normalizedCity);

    const [forecast, marine] = await Promise.all([
      weatherClient.getDailyForecast(location),
      weatherClient.getMarineForecast(location)
    ]);

    const enriched = mergeMarineByDate(forecast, marine);

    return {
      location,
      days: rankActivities(enriched)
    };
  }
});
```

- [ ] **Step 4: Update the GraphQL API test fixture**

`apps/backend/tests/api/graphql.test.ts` mocks the ranking service. It does not need to mock the new `OpenMeteoClient` method (the mocked service short-circuits the client) — but ensure no compile errors.

Run: `bun run typecheck`

Expected: PASS.

- [ ] **Step 5: Run the entire backend test suite**

Run: `bun --filter backend test`

Expected: PASS — all tests including the 3 new service tests and the existing API tests (the API tests' mocked service does not exercise the marine path).

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/services/ranking.service.ts apps/backend/tests/integration/ranking.service.test.ts
git commit -m "feat(backend): merge marine forecast into ranking service in parallel"
```

---

### Task 9: Wire caching into the Open-Meteo client

**Files:**
- Modify: `apps/backend/src/clients/openMeteo.client.ts`
- Modify: `apps/backend/tests/unit/openMeteo.client.test.ts`

- [ ] **Step 1: Add failing tests for cache hits**

Append to the outer `describe("Open-Meteo client", ...)` block in `apps/backend/tests/unit/openMeteo.client.test.ts`:

```ts
  describe("caching", () => {
    it("serves repeat geocoding lookups from cache", async () => {
      const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
        jsonResponse({
          results: [
            { name: "Lisbon", country: "Portugal", latitude: 38.72, longitude: -9.14 }
          ]
        })
      );

      const client = createOpenMeteoClient();
      await client.searchLocation("Lisbon");
      await client.searchLocation("Lisbon");
      await client.searchLocation("LISBON ");

      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("serves repeat forecast lookups from cache", async () => {
      const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
        jsonResponse({
          daily: {
            time: ["2026-04-28"],
            temperature_2m_min: [10],
            temperature_2m_max: [20],
            precipitation_sum: [1],
            snowfall_sum: [0],
            wind_speed_10m_max: [12]
          }
        })
      );

      const client = createOpenMeteoClient();
      const location = {
        name: "Lisbon",
        country: "Portugal",
        latitude: 38.72,
        longitude: -9.14
      };

      await client.getDailyForecast(location);
      await client.getDailyForecast(location);

      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("serves repeat marine lookups from cache, including the null result", async () => {
      const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(JSON.stringify({ error: true, reason: "no marine data" }), {
          status: 400,
          headers: { "content-type": "application/json" }
        })
      );

      const client = createOpenMeteoClient();
      const inland = {
        name: "Denver",
        country: "USA",
        latitude: 39.74,
        longitude: -104.99
      };

      const first = await client.getMarineForecast(inland);
      const second = await client.getMarineForecast(inland);

      expect(first).toBeNull();
      expect(second).toBeNull();
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `bun --filter backend test tests/unit/openMeteo.client.test.ts`

Expected: FAIL — caching is not yet wired, so each call hits fetch.

- [ ] **Step 3: Wire caches into the client**

Edit `apps/backend/src/clients/openMeteo.client.ts`. Add the cache import near the top:

```ts
import { createTtlCache, type TtlCache } from "../lib/cache.js";
```

Define the TTL constants near the other top-of-file values (above the schemas):

```ts
const GEOCODING_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const FORECAST_TTL_MS = 30 * 60 * 1000; // 30 minutes
const MARINE_NULL_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

type ClientCaches = {
  geocodingCache: TtlCache<Location>;
  forecastCache: TtlCache<WeatherDay[]>;
  marineCache: TtlCache<MarineDay[] | null>;
};
```

Update the `createOpenMeteoClient` signature to accept optional caches and use them. Replace the entire factory implementation with:

```ts
export const createOpenMeteoClient = (
  caches?: Partial<ClientCaches>
): OpenMeteoClient => {
  const geocodingCache = caches?.geocodingCache ?? createTtlCache<Location>(GEOCODING_TTL_MS);
  const forecastCache = caches?.forecastCache ?? createTtlCache<WeatherDay[]>(FORECAST_TTL_MS);
  const marineCache = caches?.marineCache ?? createTtlCache<MarineDay[] | null>(FORECAST_TTL_MS);

  return {
    async searchLocation(city) {
      const cacheKey = city.trim().toLowerCase();
      const cached = geocodingCache.get(cacheKey);
      if (cached) {
        return cached;
      }

      const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
      url.searchParams.set("name", city);
      url.searchParams.set("count", "1");
      url.searchParams.set("language", "en");
      url.searchParams.set("format", "json");

      const payload = parseProviderPayload(geocodingSchema, await fetchJson(url));
      const location = payload.results?.[0];

      if (!location) {
        throw locationNotFoundError(city);
      }

      geocodingCache.set(cacheKey, location);
      return location;
    },

    async getDailyForecast(location) {
      const cacheKey = `${location.latitude.toFixed(2)},${location.longitude.toFixed(2)}`;
      const cached = forecastCache.get(cacheKey);
      if (cached) {
        return cached;
      }

      const url = new URL("https://api.open-meteo.com/v1/forecast");
      url.searchParams.set("latitude", String(location.latitude));
      url.searchParams.set("longitude", String(location.longitude));
      url.searchParams.set(
        "daily",
        [
          "temperature_2m_max",
          "temperature_2m_min",
          "precipitation_sum",
          "snowfall_sum",
          "wind_speed_10m_max"
        ].join(",")
      );
      url.searchParams.set("forecast_days", String(FORECAST_DAYS));
      url.searchParams.set("timezone", "auto");

      const payload = parseProviderPayload(forecastSchema, await fetchJson(url));

      const days = payload.daily.time.map((date, index) => ({
        date,
        temperatureMinC: payload.daily.temperature_2m_min[index] ?? 0,
        temperatureMaxC: payload.daily.temperature_2m_max[index] ?? 0,
        precipitationMm: payload.daily.precipitation_sum[index] ?? 0,
        snowfallCm: payload.daily.snowfall_sum[index] ?? 0,
        windSpeedKph: payload.daily.wind_speed_10m_max[index] ?? 0
      }));

      forecastCache.set(cacheKey, days);
      return days;
    },

    async getMarineForecast(location) {
      const cacheKey = `${location.latitude.toFixed(2)},${location.longitude.toFixed(2)}`;
      const cached = marineCache.get(cacheKey);
      if (cached !== undefined) {
        return cached;
      }

      const url = new URL("https://marine-api.open-meteo.com/v1/marine");
      url.searchParams.set("latitude", String(location.latitude));
      url.searchParams.set("longitude", String(location.longitude));
      url.searchParams.set(
        "daily",
        ["wave_height_max", "wave_period_max", "wind_wave_height_max"].join(",")
      );
      url.searchParams.set("forecast_days", String(FORECAST_DAYS));
      url.searchParams.set("timezone", "auto");

      const raw = await fetchMarineJson(url);

      if (raw === null) {
        marineCache.set(cacheKey, null, MARINE_NULL_TTL_MS);
        return null;
      }

      const payload = parseProviderPayload(marineSchema, raw);

      if (payload.daily.time.length === 0) {
        marineCache.set(cacheKey, null, MARINE_NULL_TTL_MS);
        return null;
      }

      const days = payload.daily.time.map((date, index) => ({
        date,
        waveHeightMaxM: payload.daily.wave_height_max[index] ?? 0,
        wavePeriodMaxS: payload.daily.wave_period_max[index] ?? 0,
        windWaveHeightMaxM: payload.daily.wind_wave_height_max[index] ?? 0
      }));

      marineCache.set(cacheKey, days);
      return days;
    }
  };
};
```

Note the `cached !== undefined` check on the marine cache: `null` is a valid stored value distinct from "key missing." Using truthy-check would re-fetch on every cached `null`.

- [ ] **Step 4: Run the client tests to verify all pass**

Run: `bun --filter backend test tests/unit/openMeteo.client.test.ts`

Expected: PASS — original 4 retry/error tests + 5 marine tests + 3 caching tests.

- [ ] **Step 5: Run the entire backend test suite**

Run: `bun --filter backend test`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/clients/openMeteo.client.ts apps/backend/tests/unit/openMeteo.client.test.ts
git commit -m "feat(backend): cache geocoding, forecast, and marine responses in client"
```

---

### Task 10: Update the README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Replace the README contents**

Replace the entire `README.md` with:

```markdown
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
- Weather data: Open-Meteo (forecast + marine)

## Architecture

```txt
apps/
  backend/
    src/
      graphql/      # Yoga schema binding and thin resolvers
      services/     # Use-case orchestration (parallel forecast + marine)
      domain/       # Pure ranking, weather, marine domain types
      clients/      # Open-Meteo HTTP client (forecast, marine, geocoding)
      lib/          # Shared backend utilities (errors, logger, ttl cache)
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

## Runtime

The application targets **Node.js 20+**. Bun is used as the package manager and dev runner because it speeds up the install/test loop on this monorepo, but the produced JavaScript runs on Node — Hono and GraphQL Yoga are both runtime-agnostic. To use npm instead: replace `bun install` with `npm install`, `bun run` with `npm run`, and `bun --filter` with `npm --workspace`.

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

## Caching

The Open-Meteo client uses three in-memory TTL caches with lazy eviction:

| Cache | TTL | Reason |
|---|---|---|
| Geocoding | 24h | Cities don't move |
| Forecast | 30min | Open-Meteo refreshes a few times daily |
| Marine | 30min for hits, 24h for `null` | Coastlines don't move; landlocked cities stay landlocked |

Caching the "no coastal forecast" result for landlocked locations matters: without it, every search for Denver would ping the marine API and get a 400 back forever.

## Marine Forecast Handling

Surfing scoring uses Open-Meteo's marine API (wave height, wave period). For locations with no coastal data — landlocked cities, marine API outages — the surfing row scores `0` with reason `"No coastal forecast available for this location."` Other activities still rank normally.

This is preferred over fabricating a surfing score from land weather, which would imply rideable conditions that don't exist.

## Trade-Offs

Vite is used instead of TanStack Start or Next.js because the take-home brief rewards clean frontend/backend separation, GraphQL boundaries, and testable domain logic more than full-stack framework features.

urql is used instead of Apollo because the frontend only needs straightforward GraphQL query execution.

Schema-first SDL is used instead of a code-first schema builder because the API is small and the readable contract matters more than extra abstraction.

GraphQL Code Generator is still used on the frontend so urql receives typed query documents without coupling the UI to backend internals.

Scoring uses a small `tier()` helper so threshold-based bonuses read like a declarative table. This keeps `scoring.ts` skimmable and makes adding a new tier a one-line change rather than a nested ternary edit.

## AI Usage

AI was used to compare stack trade-offs, extract the PDF requirements, and scaffold the initial architecture. The implementation keeps the important logic in small, testable modules so generated code can be reviewed and replaced safely.

## Future Improvements

Deliberate omissions for the take-home scope:

- **Cache size cap.** The current TTL cache has no LRU eviction. For higher-traffic deployments a bounded cache (e.g., `lru-cache`) would prevent unbounded growth.
- **Persistent cache.** An in-memory cache resets on process restart. Redis or a similar store would let multiple backend instances share warm cache and survive deploys.
- **CI workflow.** A GitHub Actions workflow running `bun test && bun typecheck` would gate PRs.
- **Skiing elevation context.** The current heuristic treats sea-level snow the same as resort-level snow.
- **Rate limiting.** A lightweight rate limiter on `/graphql` would protect against accidental client loops.

## Omissions From the Original Spec

- UI polish is intentionally focused; the backend architecture, error handling, caching, and tests carry the bulk of the senior-engineer signal.
- The frontend does not currently surface a dedicated "this location has no surfing data" UI affordance — the existing `reason` field on the score-0 row carries that information through the same code path as every other reason.
```

- [ ] **Step 2: Verify the README renders sensibly**

Run: `cat README.md | head -50` and skim — confirm the new sections (Runtime, Caching, Marine Forecast Handling, Future Improvements) appear and prior sections are preserved.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: clarify Bun-vs-Node runtime, caching strategy, and marine fallback"
```

---

### Task 11: Final integration check

**Files:** none

- [ ] **Step 1: Run the entire test suite**

Run: `bun run test`

Expected: PASS — all tests across `backend`, `frontend`, and `contracts` workspaces. Backend should now have ~30+ tests; frontend should have its existing 115; contracts should pass build.

- [ ] **Step 2: Run typecheck across all workspaces**

Run: `bun run typecheck`

Expected: PASS — no type errors in any workspace.

- [ ] **Step 3: Run the build to confirm production output is clean**

Run: `bun run build`

Expected: PASS.

- [ ] **Step 4: Manual smoke check the dev server briefly (optional but recommended)**

Run in one terminal: `bun --filter backend dev`
Run in another: `curl -s -X POST http://localhost:4000/graphql -H 'content-type: application/json' -d '{"query":"{ activityRankings(city: \"Lisbon\") { location { name } days { date rankings { activity score reason } } } }"}' | head -c 1000`

Expected: GraphQL response with surfing scoring above 0 for Lisbon (coastal). Repeat with `"Denver"` and confirm surfing scores 0 with the no-coastal-forecast reason.

Stop the backend dev server (Ctrl+C).

- [ ] **Step 5: Confirm no uncommitted changes**

Run: `git status`

Expected: working tree clean. All work is in committed atomic units.
