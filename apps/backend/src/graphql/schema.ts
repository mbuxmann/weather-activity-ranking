import SchemaBuilder from "@pothos/core";
import { activities, type ActivityScore, type DailyActivityRanking } from "../domain/ranking/types.js";
import type { Location } from "../domain/weather/types.js";
import type { ActivityRankingResult, RankingService } from "../services/ranking.service.js";

type SchemaTypes = {
  DefaultFieldNullability: false;
  Objects: {
    ActivityRankingResult: ActivityRankingResult;
    Location: Location;
    DailyActivityRanking: DailyActivityRanking;
    ActivityScore: ActivityScore;
  };
};

const createBuilder = () =>
  new SchemaBuilder<SchemaTypes>({
    defaultFieldNullability: false
  });

export const createGraphqlSchema = (rankingService: RankingService) => {
  const builder = createBuilder();

  const ActivityEnum = builder.enumType("Activity", {
    values: activities
  });

  const LocationRef = builder.objectRef<Location>("Location").implement({
    fields: (t) => ({
      name: t.exposeString("name"),
      country: t.exposeString("country"),
      latitude: t.exposeFloat("latitude"),
      longitude: t.exposeFloat("longitude")
    })
  });

  const ActivityScoreRef = builder.objectRef<ActivityScore>("ActivityScore").implement({
    fields: (t) => ({
      activity: t.field({
        type: ActivityEnum,
        resolve: (score) => score.activity
      }),
      score: t.exposeInt("score"),
      reason: t.exposeString("reason")
    })
  });

  const DailyActivityRankingRef = builder
    .objectRef<DailyActivityRanking>("DailyActivityRanking")
    .implement({
      fields: (t) => ({
        date: t.exposeString("date"),
        rankings: t.field({
          type: [ActivityScoreRef],
          resolve: (day) => day.rankings
        })
      })
    });

  const ActivityRankingResultRef = builder
    .objectRef<ActivityRankingResult>("ActivityRankingResult")
    .implement({
      fields: (t) => ({
        location: t.field({
          type: LocationRef,
          resolve: (result) => result.location
        }),
        days: t.field({
          type: [DailyActivityRankingRef],
          resolve: (result) => result.days
        })
      })
    });

  builder.queryType({
    fields: (t) => ({
      activityRankings: t.field({
        type: ActivityRankingResultRef,
        args: {
          city: t.arg.string({
            required: true
          })
        },
        resolve: (_root, args) => rankingService.getActivityRankings(args.city)
      })
    })
  });

  return builder.toSchema();
};
