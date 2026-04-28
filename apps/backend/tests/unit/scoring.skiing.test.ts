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
    // Once the snowfall bonus saturates, adding more snow shouldn't move the score.
    expect(enormous.score).toBe(lots.score);
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
