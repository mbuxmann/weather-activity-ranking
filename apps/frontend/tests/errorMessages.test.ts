import { describe, expect, it } from "vitest";
import { getActivityRankingErrorMessage } from "../src/api/errorMessages";

describe("getActivityRankingErrorMessage", () => {
  it("maps known GraphQL error codes to friendly messages", () => {
    const error = {
      graphQLErrors: [
        {
          extensions: {
            code: "LOCATION_NOT_FOUND"
          }
        }
      ],
      networkError: undefined
    };

    expect(getActivityRankingErrorMessage(error)).toBe(
      "We could not find that city. Check the spelling and try again."
    );
  });

  it("maps provider outages to a retryable message", () => {
    const error = {
      graphQLErrors: [
        {
          extensions: {
            code: "WEATHER_PROVIDER_UNAVAILABLE"
          }
        }
      ],
      networkError: undefined
    };

    expect(getActivityRankingErrorMessage(error)).toBe(
      "Weather data is temporarily unavailable. Try again in a moment."
    );
  });

  it("maps network failures before generic GraphQL failures", () => {
    const error = {
      graphQLErrors: [
        {
          extensions: {
            code: "INTERNAL_ERROR"
          }
        }
      ],
      networkError: new Error("Failed to fetch")
    };

    expect(getActivityRankingErrorMessage(error)).toBe(
      "Could not reach the server. Check your connection and try again."
    );
  });

  it("falls back to a safe generic message", () => {
    expect(
      getActivityRankingErrorMessage({
        graphQLErrors: [],
        networkError: undefined
      })
    ).toBe("Something went wrong while ranking activities. Try again in a moment.");
  });
});
