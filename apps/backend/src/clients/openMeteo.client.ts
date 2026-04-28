import pRetry from "p-retry";
import { z } from "zod";
import { AppError } from "../lib/errors.js";
import type { Location, WeatherDay } from "../domain/weather/types.js";

const geocodingSchema = z.object({
  results: z
    .array(
      z.object({
        name: z.string(),
        country: z.string(),
        latitude: z.number(),
        longitude: z.number()
      })
    )
    .optional()
});

const forecastSchema = z.object({
  daily: z.object({
    time: z.array(z.string()),
    temperature_2m_min: z.array(z.number()),
    temperature_2m_max: z.array(z.number()),
    precipitation_sum: z.array(z.number()),
    snowfall_sum: z.array(z.number()),
    wind_speed_10m_max: z.array(z.number())
  })
});

export type OpenMeteoClient = {
  searchLocation(city: string): Promise<Location>;
  getDailyForecast(location: Location): Promise<WeatherDay[]>;
};

const fetchJson = async (url: URL): Promise<unknown> => {
  const response = await pRetry(
    async () => {
      const result = await fetch(url, {
        signal: AbortSignal.timeout(5000)
      });

      if (!result.ok) {
        throw new AppError(`Open-Meteo request failed with ${result.status}`, "OPEN_METEO_REQUEST_FAILED");
      }

      return result;
    },
    {
      retries: 2
    }
  );

  return response.json();
};

export const createOpenMeteoClient = (): OpenMeteoClient => ({
  async searchLocation(city) {
    const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
    url.searchParams.set("name", city);
    url.searchParams.set("count", "1");
    url.searchParams.set("language", "en");
    url.searchParams.set("format", "json");

    const payload = geocodingSchema.parse(await fetchJson(url));
    const location = payload.results?.[0];

    if (!location) {
      throw new AppError(`No location found for "${city}"`, "LOCATION_NOT_FOUND", 404);
    }

    return location;
  },

  async getDailyForecast(location) {
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
    url.searchParams.set("forecast_days", "7");
    url.searchParams.set("timezone", "auto");

    const payload = forecastSchema.parse(await fetchJson(url));

    return payload.daily.time.map((date, index) => ({
      date,
      temperatureMinC: payload.daily.temperature_2m_min[index] ?? 0,
      temperatureMaxC: payload.daily.temperature_2m_max[index] ?? 0,
      precipitationMm: payload.daily.precipitation_sum[index] ?? 0,
      snowfallCm: payload.daily.snowfall_sum[index] ?? 0,
      windSpeedKph: payload.daily.wind_speed_10m_max[index] ?? 0
    }));
  }
});
