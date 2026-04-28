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
    expect(ranking?.rankings.map((score) => score.activity)).toEqual([
      "OUTDOOR_SIGHTSEEING",
      "INDOOR_SIGHTSEEING",
      "SKIING",
      "SURFING"
    ]);
    expect(ranking?.rankings.map((score) => score.score)).toEqual([90, 35, 20, 0]);
  });
});
