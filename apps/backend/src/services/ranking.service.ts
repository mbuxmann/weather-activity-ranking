import { createOpenMeteoClient, type OpenMeteoClient } from "../clients/openMeteo.client.js";
import { rankActivities } from "../domain/ranking/rankActivities.js";
import type { DailyActivityRanking } from "../domain/ranking/types.js";
import type { Location } from "../domain/weather/types.js";
import { invalidCityError } from "../lib/errors.js";

export type ActivityRankingResult = {
  location: Location;
  days: DailyActivityRanking[];
};

export type RankingService = {
  getActivityRankings(city: string): Promise<ActivityRankingResult>;
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
    const forecast = await weatherClient.getDailyForecast(location);

    return {
      location,
      days: rankActivities(forecast)
    };
  }
});
