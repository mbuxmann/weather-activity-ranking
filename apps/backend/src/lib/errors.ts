import { ErrorCode } from "contracts";

export { type ErrorCode } from "contracts";

export class AppError extends Error {
  constructor(
    public readonly publicMessage: string,
    public readonly code: ErrorCode,
    public readonly statusCode = 500,
    options?: ErrorOptions
  ) {
    super(publicMessage, options);
    this.name = "AppError";
  }
}

export const invalidCityError = () =>
  new AppError("Enter a city or town to see activity rankings.", ErrorCode.INVALID_CITY, 400);

export const locationNotFoundError = (city: string) =>
  new AppError(`No location found for "${city}"`, ErrorCode.LOCATION_NOT_FOUND, 404);

export const weatherProviderUnavailableError = (cause?: unknown) =>
  new AppError(
    "Weather data is temporarily unavailable. Try again in a moment.",
    ErrorCode.WEATHER_PROVIDER_UNAVAILABLE,
    503,
    { cause }
  );

export const weatherProviderBadResponseError = (cause?: unknown) =>
  new AppError(
    "Weather data came back in an unexpected format.",
    ErrorCode.WEATHER_PROVIDER_BAD_RESPONSE,
    502,
    { cause }
  );

export const internalError = (cause?: unknown) =>
  new AppError(
    "Something went wrong while ranking activities.",
    ErrorCode.INTERNAL_ERROR,
    500,
    { cause }
  );

export const isAppError = (error: unknown): error is AppError =>
  error instanceof AppError ||
  (typeof error === "object" &&
    error !== null &&
    "publicMessage" in error &&
    typeof error.publicMessage === "string" &&
    "code" in error &&
    typeof error.code === "string" &&
    "statusCode" in error &&
    typeof error.statusCode === "number");
