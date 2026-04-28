type GraphQLErrorLike = {
  extensions?: {
    code?: unknown;
  };
};

type ActivityRankingError = {
  graphQLErrors?: readonly GraphQLErrorLike[];
  networkError?: Error | null;
};

const messagesByCode: Record<string, string> = {
  INVALID_CITY: "Enter a city or town to see activity rankings.",
  LOCATION_NOT_FOUND: "We could not find that city. Check the spelling and try again.",
  WEATHER_PROVIDER_UNAVAILABLE:
    "Weather data is temporarily unavailable. Try again in a moment.",
  WEATHER_PROVIDER_BAD_RESPONSE:
    "Weather data came back in an unexpected format. Try again in a moment.",
  INTERNAL_ERROR: "Something went wrong while ranking activities. Try again in a moment."
};

export const getActivityRankingErrorMessage = (error: ActivityRankingError): string => {
  if (error.networkError) {
    return "Could not reach the server. Check your connection and try again.";
  }

  const code = error.graphQLErrors?.find(
    (graphqlError) => typeof graphqlError.extensions?.code === "string"
  )?.extensions?.code;

  if (typeof code === "string" && code in messagesByCode) {
    return messagesByCode[code];
  }

  return messagesByCode.INTERNAL_ERROR;
};
