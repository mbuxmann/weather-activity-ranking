export const typeDefs = /* GraphQL */ `
  type Query {
    activityRankings(city: String!): ActivityRankingResult!
  }

  type ActivityRankingResult {
    location: Location!
    days: [DailyActivityRanking!]!
  }

  type Location {
    name: String!
    country: String!
    latitude: Float!
    longitude: Float!
  }

  type DailyActivityRanking {
    date: String!
    rankings: [ActivityScore!]!
  }

  type ActivityScore {
    activity: Activity!
    score: Int!
    reason: String!
  }

  enum Activity {
    SKIING
    SURFING
    OUTDOOR_SIGHTSEEING
    INDOOR_SIGHTSEEING
  }
`;
