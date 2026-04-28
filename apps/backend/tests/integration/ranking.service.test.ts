import { describe, expect, it, vi } from "vitest";
import { AppError } from "../../src/lib/errors.js";
import { createRankingService } from "../../src/services/ranking.service.js";

const silentLog = {
  info: vi.fn()
};

describe("ranking service", () => {
  it("orchestrates location lookup, forecast lookup, and ranking", async () => {
    const location = {
      name: "Cape Town",
      country: "South Africa",
      latitude: -33.92,
      longitude: 18.42
    };

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
    }, silentLog);

    await expect(service.getActivityRankings(" Cape Town ")).resolves.toMatchObject({
      location,
      days: [
        {
          date: "2026-04-28"
        }
      ]
    });
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
    }, silentLog);

    await expect(service.getActivityRankings("   ")).rejects.toMatchObject({
      code: "INVALID_CITY"
    });
    await expect(service.getActivityRankings("   ")).rejects.toBeInstanceOf(AppError);
  });

  it("adds same-date marine data to forecast days before ranking", async () => {
    const location = {
      name: "Cape Town",
      country: "South Africa",
      latitude: -33.92,
      longitude: 18.42
    };
    const service = createRankingService({
      async searchLocation() {
        return location;
      },
      async getDailyForecast() {
        return [
          {
            date: "2026-04-28",
            temperatureMinC: 16,
            temperatureMaxC: 24,
            precipitationMm: 0,
            snowfallCm: 0,
            windSpeedKph: 16
          }
        ];
      },
      async getMarineForecast() {
        return [
          {
            date: "2026-04-28",
            waveHeightMaxM: 1.5,
            wavePeriodMaxS: 10,
            windWaveHeightMaxM: 0.7
          }
        ];
      }
    }, silentLog);

    const result = await service.getActivityRankings("Cape Town");
    const surfing = result.days[0]?.rankings.find((ranking) => ranking.activity === "SURFING");

    expect(surfing?.score).toBeGreaterThan(0);
    expect(surfing?.reason).toBe(
      "Scores higher with rideable wave height, longer period, and mild conditions."
    );
  });

  it("scores surfing as unavailable when marine forecast returns null", async () => {
    const location = {
      name: "Denver",
      country: "United States",
      latitude: 39.74,
      longitude: -104.99
    };
    const service = createRankingService({
      async searchLocation() {
        return location;
      },
      async getDailyForecast() {
        return [
          {
            date: "2026-04-28",
            temperatureMinC: 18,
            temperatureMaxC: 28,
            precipitationMm: 0,
            snowfallCm: 0,
            windSpeedKph: 12
          }
        ];
      },
      async getMarineForecast() {
        return null;
      }
    }, silentLog);

    const result = await service.getActivityRankings("Denver");
    const surfing = result.days[0]?.rankings.find((ranking) => ranking.activity === "SURFING");

    expect(surfing).toEqual({
      activity: "SURFING",
      score: 0,
      reason: "No coastal forecast available for this location."
    });
  });

  it("logs the ranking lifecycle with useful operational context", async () => {
    const log = {
      info: vi.fn()
    };
    const location = {
      name: "Cape Town",
      country: "South Africa",
      latitude: -33.9249,
      longitude: 18.4241
    };
    const service = createRankingService(
      {
        async searchLocation() {
          return location;
        },
        async getDailyForecast() {
          return [
            {
              date: "2026-04-28",
              temperatureMinC: 16,
              temperatureMaxC: 24,
              precipitationMm: 0,
              snowfallCm: 0,
              windSpeedKph: 16
            }
          ];
        },
        async getMarineForecast() {
          return [
            {
              date: "2026-04-28",
              waveHeightMaxM: 1.5,
              wavePeriodMaxS: 10,
              windWaveHeightMaxM: 0.7
            }
          ];
        }
      },
      log
    );

    await service.getActivityRankings(" Cape Town ");

    expect(log.info).toHaveBeenCalledWith(
      { city: "Cape Town" },
      "Ranking request received"
    );
    expect(log.info).toHaveBeenCalledWith(
      {
        city: "Cape Town",
        resolvedName: "Cape Town",
        country: "South Africa",
        latitude: -33.92,
        longitude: 18.42
      },
      "Location resolved"
    );
    expect(log.info).toHaveBeenCalledWith(
      {
        city: "Cape Town",
        forecastDays: 1,
        marineDays: 1,
        marineAvailable: true
      },
      "Forecast data loaded"
    );
    expect(log.info).toHaveBeenCalledWith(
      { city: "Cape Town", rankedDays: 1 },
      "Ranking request completed"
    );
  });
});
