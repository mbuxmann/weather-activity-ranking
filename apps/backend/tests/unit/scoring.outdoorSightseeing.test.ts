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
