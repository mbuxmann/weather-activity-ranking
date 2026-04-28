import type { Activity } from "./activities.generated.js";

/**
 * Structural input contract for ranking-derivation helpers. Any shape that
 * provides `days[].date` plus per-day `rankings[].activity, score` satisfies
 * this — the GraphQL response on the frontend, backend service types, and
 * any future consumer (notification job, digest email) all conform.
 *
 * `ReadonlyArray` is used so callers with richer arrays (e.g. rankings that
 * also carry `reason`) are assignable here — TS arrays are invariant in
 * their element type, but `ReadonlyArray` is covariant.
 */
export type RankingForecast = {
  days: ReadonlyArray<{
    date: string;
    rankings: ReadonlyArray<{
      activity: Activity;
      score: number;
    }>;
  }>;
};

/** "Best day across the week" summary entry — one per activity. */
export type BestDay = {
  activity: Activity;
  date: string;
  score: number;
};

/**
 * For each activity, find which day in the forecast wins. Returned in the
 * order activities first appear at the top of any day (i.e. the order
 * encoded in the `Activity` enum here: SKIING, SURFING, OUTDOOR, INDOOR),
 * so consumers' summary lists are stable across cities.
 *
 * Pure derivation — same forecast in, same `BestDay[]` out. Lives in
 * contracts so the web client, backend jobs, and future channels (push,
 * email digests) compute the identical answer without re-implementing.
 *
 * Ties go to the earlier day (strict `>` comparison).
 */
export function findBestDayPerActivity(forecast: RankingForecast): BestDay[] {
  const seen = new Map<Activity, BestDay>();

  for (const day of forecast.days) {
    for (const ranking of day.rankings) {
      const current = seen.get(ranking.activity);
      if (!current || ranking.score > current.score) {
        seen.set(ranking.activity, {
          activity: ranking.activity,
          date: day.date,
          score: ranking.score,
        });
      }
    }
  }

  return Array.from(seen.values());
}
