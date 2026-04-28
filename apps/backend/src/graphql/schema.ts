import { readFileSync } from "node:fs";
import { createSchema } from "graphql-yoga";
import { schemaPath } from "contracts";
import { createResolvers } from "./resolvers.js";
import type { RankingService } from "../services/ranking.service.js";

const typeDefs = readFileSync(schemaPath, "utf8");

export const createGraphqlSchema = (rankingService: RankingService) =>
  createSchema({
    typeDefs,
    resolvers: createResolvers(rankingService)
  });
