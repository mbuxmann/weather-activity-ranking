import { describe, expect, it } from "vitest";
import { scoreSurfing } from "../../src/domain/ranking/scoring.js";
import type { WeatherDay } from "../../src/domain/weather/types.js";

const baseDay = (overrides: Partial<WeatherDay> = {}): WeatherDay => ({
  date: "2026-04-28",
  temperatureMinC: 16,
  temperatureMaxC: 22,
  precipitationMm: 0,
  snowfallCm: 0,
  windSpeedKph: 18,
  marine: {
    date: "2026-04-28",
    waveHeightMaxM: 1.5,
    wavePeriodMaxS: 10,
    windWaveHeightMaxM: 0.8
  },
  ...overrides
});

describe("scoreSurfing", () => {
  it("returns SURFING with an honest no-coast reason when marine data is absent", () => {
    const result = scoreSurfing(baseDay({ marine: undefined, temperatureMaxC: 30 }));

    expect(result).toEqual({
      activity: "SURFING",
      score: 0,
      reason: "No coastal forecast available for this location."
    });
  });

  it("rewards rideable wave height and longer periods", () => {
    const good = scoreSurfing(baseDay());
    const flat = scoreSurfing(
      baseDay({
        marine: {
          date: "2026-04-28",
          waveHeightMaxM: 0.1,
          wavePeriodMaxS: 4,
          windWaveHeightMaxM: 0.1
        }
      })
    );

    expect(good.score).toBeGreaterThan(flat.score);
  });

  it("gives a smaller bonus for marginal waves than sweet-spot waves", () => {
    const sweetSpot = scoreSurfing(baseDay({ marine: { ...baseDay().marine!, waveHeightMaxM: 2 } }));
    const marginal = scoreSurfing(baseDay({ marine: { ...baseDay().marine!, waveHeightMaxM: 0.7 } }));

    expect(sweetSpot.score).toBeGreaterThan(marginal.score);
  });

  it("rewards warm conditions when marine data exists", () => {
    const warm = scoreSurfing(baseDay({ temperatureMaxC: 22 }));
    const cold = scoreSurfing(baseDay({ temperatureMaxC: 10 }));

    expect(warm.score).toBeGreaterThan(cold.score);
  });

  it("penalises storm risk and clamps scores to 0-100", () => {
    const clear = scoreSurfing(baseDay({ precipitationMm: 0 }));
    const stormy = scoreSurfing(baseDay({ precipitationMm: 30 }));

    expect(clear.score).toBeGreaterThan(stormy.score);
    expect(clear.score).toBeLessThanOrEqual(100);
    expect(stormy.score).toBeGreaterThanOrEqual(0);
  });
});
