import { createOpenMeteoClient, type OpenMeteoClient } from "../clients/openMeteo.client.js";
import { rankActivities } from "../domain/ranking/rankActivities.js";
import type { DailyActivityRanking } from "../domain/ranking/types.js";
import type { Location } from "../domain/weather/types.js";
import { invalidCityError } from "../lib/errors.js";
import { logger, type AppLogger } from "../lib/logger.js";

export type ActivityRankingResult = {
  location: Location;
  days: DailyActivityRanking[];
};

export type RankingService = {
  getActivityRankings(city: string): Promise<ActivityRankingResult>;
};

type RankingServiceLogger = Pick<AppLogger, "info">;

const roundCoordinate = (value: number): number => Number(value.toFixed(2));

export const createRankingService = (
  weatherClient: OpenMeteoClient = createOpenMeteoClient(),
  log: RankingServiceLogger = logger
): RankingService => ({
  async getActivityRankings(city) {
    const normalizedCity = city.trim();

    if (!normalizedCity) {
      throw invalidCityError();
    }

    log.info({ city: normalizedCity }, "Ranking request received");

    const location = await weatherClient.searchLocation(normalizedCity);
    log.info(
      {
        city: normalizedCity,
        resolvedName: location.name,
        country: location.country,
        latitude: roundCoordinate(location.latitude),
        longitude: roundCoordinate(location.longitude)
      },
      "Location resolved"
    );

    const [forecast, marine] = await Promise.all([
      weatherClient.getDailyForecast(location),
      weatherClient.getMarineForecast(location)
    ]);
    log.info(
      {
        city: normalizedCity,
        forecastDays: forecast.length,
        marineDays: marine?.length ?? 0,
        marineAvailable: Boolean(marine)
      },
      "Forecast data loaded"
    );

    const marineByDate = new Map(marine?.map((day) => [day.date, day]));
    const forecastWithMarine = forecast.map((day) => ({
      ...day,
      marine: marineByDate.get(day.date)
    }));
    const days = rankActivities(forecastWithMarine);

    log.info(
      {
        city: normalizedCity,
        rankedDays: days.length
      },
      "Ranking request completed"
    );

    return {
      location,
      days
    };
  }
});
