import { gql } from "urql";

export const ActivityRankingsQuery = gql`
  query ActivityRankings($city: String!) {
    activityRankings(city: $city) {
      location {
        name
        country
        latitude
        longitude
      }
      days {
        date
        rankings {
          activity
          score
          reason
        }
      }
    }
  }
`;

export type ActivityScore = {
  activity: "SKIING" | "SURFING" | "OUTDOOR_SIGHTSEEING" | "INDOOR_SIGHTSEEING";
  score: number;
  reason: string;
};

export type DailyActivityRanking = {
  date: string;
  rankings: ActivityScore[];
};

export type ActivityRankingsData = {
  activityRankings: {
    location: {
      name: string;
      country: string;
      latitude: number;
      longitude: number;
    };
    days: DailyActivityRanking[];
  };
};
