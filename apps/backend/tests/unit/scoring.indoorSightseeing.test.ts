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
