import { type Activity } from "contracts";
import type { ActivityRankingsQuery } from "../api/generated";

export type RankingResult = ActivityRankingsQuery["activityRankings"];

export type Ranking = {
  activity: Activity;
  score: number;
  reason: string;
};

export type RankedDay = {
  date: string;
  rankings: Ranking[];
};

export function buildRankedDays(result: RankingResult): RankedDay[] {
  return result.days.map((day) => ({
    date: day.date,
    rankings: [...day.rankings].sort((a, b) => b.score - a.score),
  }));
}

export function formatBestDay(date: string): { weekday: string; date: string } {
  const parsed = new Date(`${date}T00:00:00`);
  return {
    weekday: new Intl.DateTimeFormat("en", { weekday: "long" }).format(parsed),
    date: new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(parsed),
  };
}

export function formatShortWeekday(date: string): string {
  return new Intl.DateTimeFormat("en", { weekday: "short" }).format(
    new Date(`${date}T00:00:00`),
  );
}

export function normalizeScore(score: number): number {
  if (Number.isNaN(score)) return 0;
  return Math.max(0, Math.min(100, score)) / 100;
}

export function displayScore(score: number): string {
  return (Math.max(0, Math.min(100, score)) / 10).toFixed(1);
}
