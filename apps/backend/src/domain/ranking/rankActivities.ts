import type { DailyActivityRanking } from "./types.js";
import type { WeatherDay } from "../weather/types.js";
import {
  scoreIndoorSightseeing,
  scoreOutdoorSightseeing,
  scoreSkiing,
  scoreSurfing
} from "./scoring.js";

export const rankActivities = (days: WeatherDay[]): DailyActivityRanking[] =>
  days.map((day) => ({
    date: day.date,
    rankings: [
      scoreSkiing(day),
      scoreSurfing(day),
      scoreOutdoorSightseeing(day),
      scoreIndoorSightseeing(day)
    ].sort((left, right) => right.score - left.score)
  }));
