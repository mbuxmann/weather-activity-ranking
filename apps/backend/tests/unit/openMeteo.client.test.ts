import { afterEach, describe, expect, it, vi } from "vitest";
import { createOpenMeteoClient } from "../../src/clients/openMeteo.client.js";
import { AppError } from "../../src/lib/errors.js";

const jsonResponse = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "content-type": "application/json"
    },
    ...init
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
          daily: {
            time: ["2026-04-28"],
            temperature_2m_min: [10],
            temperature_2m_max: [20],
            precipitation_sum: [1],
            snowfall_sum: [0],
            wind_speed_10m_max: [12]
          }
        })
      );

    await expect(
      createOpenMeteoClient().getDailyForecast({
        name: "Lisbon",
        country: "Portugal",
        latitude: 38.72,
        longitude: -9.14
      })
    ).resolves.toEqual([
      {
        date: "2026-04-28",
        temperatureMinC: 10,
        temperatureMaxC: 20,
        precipitationMm: 1,
        snowfallCm: 0,
        windSpeedKph: 12
      }
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("does not retry non-retryable provider failures", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("bad request", { status: 400 }));
    const result = createOpenMeteoClient().getDailyForecast({
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
      createOpenMeteoClient().getDailyForecast({
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
      createOpenMeteoClient().getDailyForecast({
        name: "Lisbon",
        country: "Portugal",
        latitude: 38.72,
        longitude: -9.14
      })
    ).rejects.toMatchObject({
      code: "WEATHER_PROVIDER_BAD_RESPONSE"
    });
  });
});
