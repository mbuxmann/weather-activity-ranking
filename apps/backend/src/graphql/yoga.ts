import { createYoga } from "graphql-yoga";
import { createGraphqlSchema } from "./schema.js";
import type { RankingService } from "../services/ranking.service.js";

export const createYogaHandler = (rankingService: RankingService) =>
  createYoga({
    schema: createGraphqlSchema(rankingService),
    graphqlEndpoint: "/graphql"
  });
