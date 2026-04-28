import { FORECAST_DAYS } from "contracts";
import pRetry, { AbortError } from "p-retry";
import { z, ZodError } from "zod";
import { createTtlCache, type TtlCache } from "../lib/cache.js";
import { logger, type AppLogger } from "../lib/logger.js";
import {
  isAppError,
  locationNotFoundError,
  weatherProviderBadResponseError,
  weatherProviderUnavailableError
} from "../lib/errors.js";
import type { Location, MarineDay, WeatherDay } from "../domain/weather/types.js";

const GEOCODING_TTL_MS = 24 * 60 * 60 * 1000;
const FORECAST_TTL_MS = 30 * 60 * 1000;
const MARINE_UNAVAILABLE_TTL_MS = 24 * 60 * 60 * 1000;

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

const forecastDailySeries = [
  "temperature_2m_min",
  "temperature_2m_max",
  "precipitation_sum",
  "snowfall_sum",
  "wind_speed_10m_max"
] as const;

const marineForecastSchema = z.object({
  daily: z.object({
    time: z.array(z.string()),
    wave_height_max: z.array(z.number().nullable()),
    wave_period_max: z.array(z.number().nullable()),
    wind_wave_height_max: z.array(z.number().nullable())
  })
});

export type OpenMeteoClient = {
  searchLocation(city: string): Promise<Location>;
  getDailyForecast(location: Location): Promise<WeatherDay[]>;
  getMarineForecast(location: Location): Promise<MarineDay[] | null>;
};

type OpenMeteoClientDeps = {
  geocodingCache?: TtlCache<Location>;
  forecastCache?: TtlCache<WeatherDay[]>;
  marineCache?: TtlCache<MarineDay[] | null>;
  logger?: Pick<AppLogger, "debug" | "info">;
};

class MarineForecastUnavailable extends Error {
  constructor() {
    super("Marine forecast is unavailable for this location.");
  }
}

const isRetryableStatus = (status: number): boolean =>
  status === 408 || status === 429 || status >= 500;

const normalizeCityKey = (city: string): string => city.trim().toLowerCase();

const locationKey = (location: Location): string =>
  `${location.latitude.toFixed(2)},${location.longitude.toFixed(2)}`;

const fetchJson = async (url: URL): Promise<unknown> => {
  try {
    const response = await pRetry(
      async () => {
        const result = await fetch(url, {
          signal: AbortSignal.timeout(5000)
        });

        if (!result.ok) {
          const error = weatherProviderUnavailableError(
            new Error(`Open-Meteo request failed with ${result.status}`)
          );

          if (!isRetryableStatus(result.status)) {
            throw new AbortError(error);
          }

          throw error;
        }

        return result;
      },
      {
        factor: 2,
        minTimeout: 25,
        retries: 2
      }
    );

    return await parseJsonResponse(response);
  } catch (error) {
    if (isAppError(error)) {
      throw error;
    }

    throw weatherProviderUnavailableError(error);
  }
};

const fetchMarineJson = async (url: URL): Promise<unknown | null> => {
  try {
    const response = await pRetry(
      async () => {
        const result = await fetch(url, {
          signal: AbortSignal.timeout(5000)
        });

        if (result.status === 400) {
          throw new AbortError(new MarineForecastUnavailable());
        }

        if (!result.ok) {
          const error = weatherProviderUnavailableError(
            new Error(`Open-Meteo marine request failed with ${result.status}`)
          );

          if (!isRetryableStatus(result.status)) {
            throw new AbortError(error);
          }

          throw error;
        }

        return result;
      },
      {
        factor: 2,
        minTimeout: 25,
        retries: 2
      }
    );

    return await parseJsonResponse(response);
  } catch (error) {
    if (error instanceof MarineForecastUnavailable) {
      return null;
    }

    if (isAppError(error)) {
      throw error;
    }

    throw weatherProviderUnavailableError(error);
  }
};

const parseJsonResponse = async (response: Response): Promise<unknown> => {
  try {
    return await response.json();
  } catch (error) {
    throw weatherProviderBadResponseError(error);
  }
};

export const createOpenMeteoClient = (
  deps: OpenMeteoClientDeps = {}
): OpenMeteoClient => {
  const geocodingCache = deps.geocodingCache ?? createTtlCache<Location>(GEOCODING_TTL_MS);
  const forecastCache = deps.forecastCache ?? createTtlCache<WeatherDay[]>(FORECAST_TTL_MS);
  const marineCache =
    deps.marineCache ?? createTtlCache<MarineDay[] | null>(FORECAST_TTL_MS);
  const log = deps.logger ?? logger;

  return {
    async searchLocation(city) {
      const cacheKey = normalizeCityKey(city);
      const cached = geocodingCache.get(cacheKey);

      if (cached) {
        log.debug({ cache: "geocoding", city: cacheKey }, "Open-Meteo cache hit");
        return cached;
      }
      log.debug({ cache: "geocoding", city: cacheKey }, "Open-Meteo cache miss");

      const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
      url.searchParams.set("name", city.trim());
      url.searchParams.set("count", "1");
      url.searchParams.set("language", "en");
      url.searchParams.set("format", "json");

      const payload = parseProviderPayload(geocodingSchema, await fetchJson(url));
      const location = payload.results?.[0];

      if (!location) {
        throw locationNotFoundError(city);
      }

      geocodingCache.set(cacheKey, location);
      log.debug(
        {
          city: cacheKey,
          resolvedName: location.name,
          country: location.country
        },
        "Open-Meteo geocoding result cached"
      );

      return location;
    },

    async getDailyForecast(location) {
      const cacheKey = locationKey(location);
      const cached = forecastCache.get(cacheKey);

      if (cached) {
        log.debug({ cache: "forecast", location: cacheKey }, "Open-Meteo cache hit");
        return cached;
      }
      log.debug({ cache: "forecast", location: cacheKey }, "Open-Meteo cache miss");

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
      url.searchParams.set("forecast_days", String(FORECAST_DAYS));
      url.searchParams.set("timezone", "auto");

      const payload = parseProviderPayload(forecastSchema, await fetchJson(url));
      assertCompleteForecastPayload(payload);

      const forecast = payload.daily.time.map((date, index) => ({
        date,
        temperatureMinC: payload.daily.temperature_2m_min[index],
        temperatureMaxC: payload.daily.temperature_2m_max[index],
        precipitationMm: payload.daily.precipitation_sum[index],
        snowfallCm: payload.daily.snowfall_sum[index],
        windSpeedKph: payload.daily.wind_speed_10m_max[index]
      }));

      forecastCache.set(cacheKey, forecast);
      log.debug(
        { location: cacheKey, forecastDays: forecast.length },
        "Open-Meteo forecast cached"
      );

      return forecast;
    },

    async getMarineForecast(location) {
      const cacheKey = locationKey(location);
      const cached = marineCache.get(cacheKey);

      if (cached !== undefined) {
        log.debug({
          cache: "marine",
          location: cacheKey,
          marineAvailable: cached !== null
        }, "Open-Meteo cache hit");
        return cached;
      }
      log.debug({ cache: "marine", location: cacheKey }, "Open-Meteo cache miss");

      const url = new URL("https://marine-api.open-meteo.com/v1/marine");
      url.searchParams.set("latitude", String(location.latitude));
      url.searchParams.set("longitude", String(location.longitude));
      url.searchParams.set(
        "daily",
        ["wave_height_max", "wave_period_max", "wind_wave_height_max"].join(",")
      );
      url.searchParams.set("forecast_days", String(FORECAST_DAYS));
      url.searchParams.set("timezone", "auto");

      const json = await fetchMarineJson(url);

      if (json === null) {
        marineCache.set(cacheKey, null, MARINE_UNAVAILABLE_TTL_MS);
        log.info({ location: cacheKey }, "No marine forecast available for location");
        return null;
      }

      const payload = parseProviderPayload(marineForecastSchema, json);

      if (payload.daily.time.length === 0) {
        marineCache.set(cacheKey, null, MARINE_UNAVAILABLE_TTL_MS);
        log.info({ location: cacheKey }, "No marine forecast days returned for location");
        return null;
      }

      const marineForecast = payload.daily.time.flatMap((date, index) => {
        const waveHeightMaxM = payload.daily.wave_height_max[index];
        const wavePeriodMaxS = payload.daily.wave_period_max[index];
        const windWaveHeightMaxM = payload.daily.wind_wave_height_max[index];

        if (
          typeof waveHeightMaxM !== "number" ||
          typeof wavePeriodMaxS !== "number" ||
          typeof windWaveHeightMaxM !== "number"
        ) {
          return [];
        }

        return [
          {
            date,
            waveHeightMaxM,
            wavePeriodMaxS,
            windWaveHeightMaxM
          }
        ];
      });

      if (marineForecast.length === 0) {
        marineCache.set(cacheKey, null, MARINE_UNAVAILABLE_TTL_MS);
        log.info({ location: cacheKey }, "Marine forecast contained no usable daily values");
        return null;
      }

      marineCache.set(cacheKey, marineForecast);
      log.debug(
        { location: cacheKey, marineDays: marineForecast.length },
        "Open-Meteo marine forecast cached"
      );

      return marineForecast;
    }
  };
};

const parseProviderPayload = <Schema extends z.ZodTypeAny>(
  schema: Schema,
  payload: unknown
): z.infer<Schema> => {
  try {
    return schema.parse(payload);
  } catch (error) {
    if (error instanceof ZodError) {
      throw weatherProviderBadResponseError(error);
    }

    throw error;
  }
};

const assertCompleteForecastPayload = (
  payload: z.infer<typeof forecastSchema>
): void => {
  const expectedLength = FORECAST_DAYS;

  if (
    payload.daily.time.length !== expectedLength ||
    forecastDailySeries.some((key) => payload.daily[key].length !== expectedLength)
  ) {
    throw weatherProviderBadResponseError(
      new Error("Open-Meteo forecast payload did not contain seven complete daily values.")
    );
  }
};
