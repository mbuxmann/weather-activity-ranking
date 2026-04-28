import type { Activity } from "contracts";

export type { Activity } from "contracts";

export type ActivityScore = {
  activity: Activity;
  score: number;
  reason: string;
};

export type DailyActivityRanking = {
  date: string;
  rankings: ActivityScore[];
};
