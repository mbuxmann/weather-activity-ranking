import { afterEach, describe, expect, it, vi } from "vitest";
import { createOpenMeteoClient } from "../../src/clients/openMeteo.client.js";
import { createTtlCache } from "../../src/lib/cache.js";
import { AppError } from "../../src/lib/errors.js";

const jsonResponse = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "content-type": "application/json"
    },
    ...init
  });

const forecastDates = Array.from(
  { length: 7 },
  (_, index) => new Date(Date.UTC(2026, 3, 28 + index)).toISOString().slice(0, 10)
);

const completeForecastDaily = (
  overrides: Partial<{
    time: string[];
    temperature_2m_min: number[];
    temperature_2m_max: number[];
    precipitation_sum: number[];
    snowfall_sum: number[];
    wind_speed_10m_max: number[];
  }> = {}
) => ({
  time: forecastDates,
  temperature_2m_min: Array(7).fill(10),
  temperature_2m_max: Array(7).fill(20),
  precipitation_sum: Array(7).fill(1),
  snowfall_sum: Array(7).fill(0),
  wind_speed_10m_max: Array(7).fill(12),
  ...overrides
});

const silentLogger = {
  debug: vi.fn(),
  info: vi.fn()
};

const createTestClient = (
  deps: Parameters<typeof createOpenMeteoClient>[0] = {}
) =>
  createOpenMeteoClient({
    ...deps,
    logger: silentLogger
  });

describe("Open-Meteo client", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("retries transient provider failures before returning forecast data", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("temporarily unavailable", { status: 500 }))
      .mockResolvedValueOnce(new Response("still unavailable", { status: 500 }))
      .mockResolvedValueOnce(
        jsonResponse({
          daily: completeForecastDaily()
        })
      );

    const result = await createTestClient().getDailyForecast({
      name: "Lisbon",
      country: "Portugal",
      latitude: 38.72,
      longitude: -9.14
    });

    expect(result).toHaveLength(7);
    expect(result[0]).toEqual(
      {
        date: "2026-04-28",
        temperatureMinC: 10,
        temperatureMaxC: 20,
        precipitationMm: 1,
        snowfallCm: 0,
        windSpeedKph: 12
      }
    );
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("does not retry non-retryable provider failures", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("bad request", { status: 400 }));
    const result = createTestClient().getDailyForecast({
      name: "Lisbon",
      country: "Portugal",
      latitude: 38.72,
      longitude: -9.14
    });

    await expect(result).rejects.toMatchObject({
      code: "WEATHER_PROVIDER_UNAVAILABLE"
    });
    await expect(result).rejects.toBeInstanceOf(AppError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("maps invalid provider JSON to a bad response app error", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      jsonResponse({
        daily: {
          time: ["2026-04-28"]
        }
      })
    );

    await expect(
      createTestClient().getDailyForecast({
        name: "Lisbon",
        country: "Portugal",
        latitude: 38.72,
        longitude: -9.14
      })
    ).rejects.toMatchObject({
      code: "WEATHER_PROVIDER_BAD_RESPONSE"
    });
  });

  it("maps malformed provider JSON to a bad response app error", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("{", {
        status: 200,
        headers: {
          "content-type": "application/json"
        }
      })
    );

    await expect(
      createTestClient().getDailyForecast({
        name: "Lisbon",
        country: "Portugal",
        latitude: 38.72,
        longitude: -9.14
      })
    ).rejects.toMatchObject({
      code: "WEATHER_PROVIDER_BAD_RESPONSE"
    });
  });

  it("caches geocoding lookups by normalized city name", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({
        results: [
          {
            name: "Cape Town",
            country: "South Africa",
            latitude: -33.92,
            longitude: 18.42
          }
        ]
      })
    );
    const client = createTestClient({
      geocodingCache: createTtlCache(60_000)
    });

    await expect(client.searchLocation(" Cape Town ")).resolves.toMatchObject({
      name: "Cape Town"
    });
    await expect(client.searchLocation("cape town")).resolves.toMatchObject({
      name: "Cape Town"
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("caches daily forecasts by rounded coordinates", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({
        daily: completeForecastDaily()
      })
    );
    const client = createTestClient({
      forecastCache: createTtlCache(60_000)
    });

    const location = {
      name: "Lisbon",
      country: "Portugal",
      latitude: 38.7223,
      longitude: -9.1393
    };

    await client.getDailyForecast(location);
    await client.getDailyForecast({ ...location, latitude: 38.7249, longitude: -9.1351 });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("rejects partial daily forecast payloads instead of filling missing values", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      jsonResponse({
        daily: completeForecastDaily({
          precipitation_sum: [1, 1, 1]
        })
      })
    );

    await expect(
      createTestClient().getDailyForecast({
        name: "Lisbon",
        country: "Portugal",
        latitude: 38.72,
        longitude: -9.14
      })
    ).rejects.toMatchObject({
      code: "WEATHER_PROVIDER_BAD_RESPONSE"
    });
  });

  it("returns and caches marine forecast data for coastal locations", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({
        daily: {
          time: ["2026-04-28"],
          wave_height_max: [1.7],
          wave_period_max: [11],
          wind_wave_height_max: [0.8]
        }
      })
    );
    const client = createTestClient({
      marineCache: createTtlCache(60_000)
    });

    const location = {
      name: "Cape Town",
      country: "South Africa",
      latitude: -33.92,
      longitude: 18.42
    };

    await expect(client.getMarineForecast(location)).resolves.toEqual([
      {
        date: "2026-04-28",
        waveHeightMaxM: 1.7,
        wavePeriodMaxS: 11,
        windWaveHeightMaxM: 0.8
      }
    ]);
    await client.getMarineForecast(location);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns and caches null when marine data is unavailable for a location", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("no marine data", { status: 400 }));
    const client = createTestClient({
      marineCache: createTtlCache(60_000)
    });
    const location = {
      name: "Denver",
      country: "United States",
      latitude: 39.74,
      longitude: -104.99
    };

    await expect(client.getMarineForecast(location)).resolves.toBeNull();
    await expect(client.getMarineForecast(location)).resolves.toBeNull();

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns null when the marine endpoint responds with only null daily values", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({
        daily: {
          time: ["2026-04-28", "2026-04-29"],
          wave_height_max: [null, null],
          wave_period_max: [null, null],
          wind_wave_height_max: [null, null]
        }
      })
    );

    await expect(
      createTestClient().getMarineForecast({
        name: "Reykjavik",
        country: "Iceland",
        latitude: 64.13548,
        longitude: -21.89541
      })
    ).resolves.toBeNull();
  });
});
