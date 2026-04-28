import type { RankingService } from "../services/ranking.service.js";

type ActivityRankingsArgs = {
  city: string;
};

export const createResolvers = (rankingService: RankingService) => ({
  Query: {
    activityRankings: async (_parent: unknown, args: ActivityRankingsArgs) =>
      rankingService.getActivityRankings(args.city)
  }
});
