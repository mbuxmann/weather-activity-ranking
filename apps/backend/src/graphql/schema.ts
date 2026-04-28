import { typeDefs } from "@weather-ranking/contracts";
import { createSchema } from "graphql-yoga";
import { createResolvers } from "./resolvers.js";
import type { RankingService } from "../services/ranking.service.js";

export const createGraphqlSchema = (rankingService: RankingService) =>
  createSchema({
    typeDefs,
    resolvers: createResolvers(rankingService)
  });
