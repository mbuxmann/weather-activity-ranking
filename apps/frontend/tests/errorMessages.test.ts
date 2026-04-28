import { ErrorCode } from "contracts";
import { describe, expect, it } from "vitest";
import { getActivityRankingErrorMessage } from "../src/api/errorMessages";

describe("getActivityRankingErrorMessage", () => {
  it("maps LOCATION_NOT_FOUND to a user-friendly message", () => {
    const error = {
      graphQLErrors: [{ extensions: { code: ErrorCode.LOCATION_NOT_FOUND } }],
    };

    expect(getActivityRankingErrorMessage(error)).toBe(
      "We could not find that city. Check the spelling and try again."
    );
  });

  it("maps INVALID_CITY to a user-friendly message", () => {
    const error = {
      graphQLErrors: [{ extensions: { code: ErrorCode.INVALID_CITY } }],
    };

    expect(getActivityRankingErrorMessage(error)).toBe(
      "Enter a city or town to see activity rankings."
    );
  });

  it("maps WEATHER_PROVIDER_UNAVAILABLE to a retryable message", () => {
    const error = {
      graphQLErrors: [
        { extensions: { code: ErrorCode.WEATHER_PROVIDER_UNAVAILABLE } },
      ],
    };

    expect(getActivityRankingErrorMessage(error)).toBe(
      "Weather data is temporarily unavailable. Try again in a moment."
    );
  });

  it("maps WEATHER_PROVIDER_BAD_RESPONSE to a retryable message", () => {
    const error = {
      graphQLErrors: [
        { extensions: { code: ErrorCode.WEATHER_PROVIDER_BAD_RESPONSE } },
      ],
    };

    expect(getActivityRankingErrorMessage(error)).toBe(
      "Weather data came back in an unexpected format. Try again in a moment."
    );
  });

  it("maps INTERNAL_ERROR to a generic message", () => {
    const error = {
      graphQLErrors: [{ extensions: { code: ErrorCode.INTERNAL_ERROR } }],
    };

    expect(getActivityRankingErrorMessage(error)).toBe(
      "Something went wrong while ranking activities. Try again in a moment."
    );
  });

  it("prioritises network errors over GraphQL error codes", () => {
    const error = {
      graphQLErrors: [{ extensions: { code: ErrorCode.INTERNAL_ERROR } }],
      networkError: new Error("Failed to fetch"),
    };

    expect(getActivityRankingErrorMessage(error)).toBe(
      "Could not reach the server. Check your connection and try again."
    );
  });

  it("falls back to INTERNAL_ERROR for an unrecognised code", () => {
    const error = {
      graphQLErrors: [{ extensions: { code: "TOTALLY_UNKNOWN" } }],
    };

    expect(getActivityRankingErrorMessage(error)).toBe(
      "Something went wrong while ranking activities. Try again in a moment."
    );
  });

  it("falls back to INTERNAL_ERROR when graphQLErrors is empty", () => {
    expect(
      getActivityRankingErrorMessage({
        graphQLErrors: [],
        networkError: undefined,
      })
    ).toBe(
      "Something went wrong while ranking activities. Try again in a moment."
    );
  });

  it("falls back to INTERNAL_ERROR when no extensions present", () => {
    const error = {
      graphQLErrors: [{ extensions: {} }],
    };

    expect(getActivityRankingErrorMessage(error)).toBe(
      "Something went wrong while ranking activities. Try again in a moment."
    );
  });
});
