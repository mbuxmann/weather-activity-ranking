import { GraphQLError } from "graphql";
import { isAppError } from "../lib/errors.js";
import type { ActivityRankingResult, RankingService } from "../services/ranking.service.js";

/** Mirrors the GraphQL schema: `activityRankings(city: String!)` */
type QueryActivityRankingsArgs = {
  city: string;
};

export const createResolvers = (rankingService: RankingService) => ({
  Query: {
    activityRankings: async (
      _parent: unknown,
      args: QueryActivityRankingsArgs
    ): Promise<ActivityRankingResult> => {
      try {
        return await rankingService.getActivityRankings(args.city);
      } catch (error) {
        if (isAppError(error)) {
          throw new GraphQLError(error.publicMessage, {
            extensions: {
              code: error.code
            }
          });
        }

        throw error;
      }
    }
  }
});
