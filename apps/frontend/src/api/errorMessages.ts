import { ErrorCode } from "contracts";

type GraphQLErrorLike = {
  extensions?: {
    code?: unknown;
  };
};

type ActivityRankingError = {
  graphQLErrors?: readonly GraphQLErrorLike[];
  networkError?: Error | null;
};

const messagesByCode: Record<ErrorCode, string> = {
  [ErrorCode.INVALID_CITY]: "Enter a city or town to see activity rankings.",
  [ErrorCode.LOCATION_NOT_FOUND]:
    "We could not find that city. Check the spelling and try again.",
  [ErrorCode.WEATHER_PROVIDER_UNAVAILABLE]:
    "Weather data is temporarily unavailable. Try again in a moment.",
  [ErrorCode.WEATHER_PROVIDER_BAD_RESPONSE]:
    "Weather data came back in an unexpected format. Try again in a moment.",
  [ErrorCode.INTERNAL_ERROR]:
    "Something went wrong while ranking activities. Try again in a moment.",
};

const isErrorCode = (code: string): code is ErrorCode =>
  code in messagesByCode;

export const getActivityRankingErrorMessage = (
  error: ActivityRankingError
): string => {
  if (error.networkError) {
    return "Could not reach the server. Check your connection and try again.";
  }

  const code = error.graphQLErrors?.find(
    (graphqlError) => typeof graphqlError.extensions?.code === "string"
  )?.extensions?.code;

  if (typeof code === "string" && isErrorCode(code)) {
    return messagesByCode[code];
  }

  return messagesByCode[ErrorCode.INTERNAL_ERROR];
};
