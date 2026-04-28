import { GraphQLError } from "graphql";
import { createYoga } from "graphql-yoga";
import { internalError, isAppError } from "../lib/errors.js";
import { logger } from "../lib/logger.js";
import { createGraphqlSchema } from "./schema.js";
import type { RankingService } from "../services/ranking.service.js";

const getOriginalError = (error: unknown): unknown => {
  if (error instanceof GraphQLError && error.originalError) {
    return getOriginalError(error.originalError);
  }

  return error;
};

const getGraphQLErrorCode = (error: unknown): string | undefined => {
  if (
    typeof error === "object" &&
    error !== null &&
    "extensions" in error &&
    typeof error.extensions === "object" &&
    error.extensions !== null &&
    "code" in error.extensions &&
    typeof error.extensions.code === "string"
  ) {
    return error.extensions.code;
  }

  return undefined;
};

const createYogaLogger = () => {
  if (process.env.NODE_ENV === "test") {
    return false;
  }

  return {
    debug: (...args: unknown[]) => logger.debug({ args }, "GraphQL debug"),
    info: (...args: unknown[]) => logger.info({ args }, "GraphQL info"),
    warn: (...args: unknown[]) => logger.warn({ args }, "GraphQL warning"),
    error: (...args: unknown[]) => {
      if (args.some((arg) => getGraphQLErrorCode(arg))) {
        return;
      }

      logger.error({ err: args[0] }, "GraphQL execution error");
    }
  };
};

export const createYogaHandler = (rankingService: RankingService) =>
  createYoga({
    logging: createYogaLogger(),
    schema: createGraphqlSchema(rankingService),
    graphqlEndpoint: "/graphql",
    maskedErrors: {
      maskError(error) {
        const code = getGraphQLErrorCode(error);

        if (code && error instanceof Error) {
          return new GraphQLError(error.message, {
            nodes: error instanceof GraphQLError ? error.nodes : undefined,
            source: error instanceof GraphQLError ? error.source : undefined,
            positions: error instanceof GraphQLError ? error.positions : undefined,
            path: error instanceof GraphQLError ? error.path : undefined,
            extensions: {
              code
            }
          });
        }

        const originalError = getOriginalError(error);
        const appError = isAppError(originalError) ? originalError : internalError(originalError);

        return new GraphQLError(appError.publicMessage, {
          nodes: error instanceof GraphQLError ? error.nodes : undefined,
          source: error instanceof GraphQLError ? error.source : undefined,
          positions: error instanceof GraphQLError ? error.positions : undefined,
          path: error instanceof GraphQLError ? error.path : undefined,
          originalError: appError,
          extensions: {
            code: appError.code
          }
        });
      }
    }
  });
