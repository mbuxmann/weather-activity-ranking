import { describe, expect, it } from "vitest";
import { AppError } from "../../src/lib/errors.js";
import { createRankingService } from "../../src/services/ranking.service.js";

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
      }
    });

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
      }
    });

    await expect(service.getActivityRankings("   ")).rejects.toMatchObject({
      code: "INVALID_CITY"
    });
    await expect(service.getActivityRankings("   ")).rejects.toBeInstanceOf(AppError);
  });
});
