import { type Activity } from "contracts";
import type { ActivityRankingsQuery } from "../api/generated";

export type RankingResult = ActivityRankingsQuery["activityRankings"];

/** A single (activity, day) ranking entry. */
export type Ranking = {
  activity: Activity;
  score: number;
  reason: string;
};

/** A day with all its activity rankings, pre-sorted best → worst. */
export type RankedDay = {
  date: string;
  rankings: Ranking[];
};

/**
 * Take the GraphQL result and ensure each day's rankings are sorted
 * descending by score. The backend already does this, but enforcing it
 * here decouples the UI from the contract — if the API ever changes
 * its sort order, the cards still render correctly.
 */
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

export function formatDayInitial(date: string): string {
  return new Intl.DateTimeFormat("en", { weekday: "narrow" }).format(
    new Date(`${date}T00:00:00`),
  );
}

/** 0–100 → 0–1, defensive against out-of-range values. */
export function normalizeScore(score: number): number {
  if (Number.isNaN(score)) return 0;
  return Math.max(0, Math.min(100, score)) / 100;
}

/**
 * Display the 0–100 backend score as a 0.0–10.0 string with one decimal.
 * Keeps full precision (the gauge fill stays accurate) while giving the
 * UI a "rated out of 10" feel that's easier to read at a glance.
 */
export function displayScore(score: number): string {
  return (Math.max(0, Math.min(100, score)) / 10).toFixed(1);
}
