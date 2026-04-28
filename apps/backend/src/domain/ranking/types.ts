export const activities = [
  "SKIING",
  "SURFING",
  "OUTDOOR_SIGHTSEEING",
  "INDOOR_SIGHTSEEING"
] as const;

export type Activity = (typeof activities)[number];

export type ActivityScore = {
  activity: Activity;
  score: number;
  reason: string;
};

export type DailyActivityRanking = {
  date: string;
  rankings: ActivityScore[];
};
