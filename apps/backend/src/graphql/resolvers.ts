import { GraphQLError } from "graphql";
import { isAppError } from "../lib/errors.js";
import type { RankingService } from "../services/ranking.service.js";

type ActivityRankingsArgs = {
  city: string;
};

export const createResolvers = (rankingService: RankingService) => ({
  Query: {
    activityRankings: async (_parent: unknown, args: ActivityRankingsArgs) => {
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
