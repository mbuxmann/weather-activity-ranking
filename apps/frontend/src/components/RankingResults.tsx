import { InfoIcon } from "lucide-react";
import { findBestDayPerActivity } from "contracts";
import type { ActivityRankingsQuery } from "../api/generated";
import { buildRankedDays } from "@/lib/rankingHelpers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DayCard } from "./DayCard";
import { BestForActivityStrip } from "./BestForActivityStrip";
import { ScoringCriteriaDialog } from "./ScoringCriteriaDialog";

type RankingResultsProps = {
  result: ActivityRankingsQuery["activityRankings"];
};

/**
 * Renders the seven-day forecast as a flexible grid of day cards. The
 * data shape is per-day → ranked activities (matching the GraphQL
 * contract), so each card answers "what to do on this day" with the
 * winning activity featured and the runners-up listed below it.
 *
 * A summary strip above the grid surfaces the "best day across the
 * week per activity" insight as a secondary glance — keeping that
 * affordance without making it the primary axis of the page.
 */
export function RankingResults({ result }: RankingResultsProps) {
  const rankedDays = buildRankedDays(result);
  const bestDays = findBestDayPerActivity(result);
  const fromDate = result.days[0]?.date;
  const toDate = result.days[result.days.length - 1]?.date;

  return (
    <section
      className="mt-16 flex flex-col gap-7 sm:mt-20"
      aria-label="Activity rankings"
    >
      {/* Location header */}
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between sm:gap-10">
        <div className="flex flex-col gap-2 animate-rise">
          <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
            Seven-day outlook · {formatRange(fromDate, toDate)}
          </span>
          <h2 className="text-[clamp(2rem,4vw,3.4rem)] font-semibold leading-none tracking-[-0.035em] text-foreground">
            {result.location.name},{" "}
            <span className="text-foreground/55">
              {result.location.country}
            </span>
          </h2>
        </div>

        <div className="shell-tray inline-flex w-max items-center gap-1 self-start rounded-full p-1 sm:self-end">
          <Badge
            variant="outline"
            className="h-auto rounded-full border-transparent bg-card px-3.5 py-1.5 text-[11px] font-medium tabular-nums text-foreground/75 shadow-[0_1px_1px_0_oklch(1_0_0/0.7)_inset] [a]:hover:bg-card"
          >
            {result.location.latitude.toFixed(2)}° N
          </Badge>
          <Badge
            variant="outline"
            className="h-auto rounded-full border-transparent bg-card px-3.5 py-1.5 text-[11px] font-medium tabular-nums text-foreground/75 shadow-[0_1px_1px_0_oklch(1_0_0/0.7)_inset] [a]:hover:bg-card"
          >
            {result.location.longitude.toFixed(2)}° E
          </Badge>
        </div>
      </header>

      {/* Per-activity summary strip + methodology trigger */}
      <div className="flex flex-col gap-3 animate-rise animate-rise-delay-1 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <BestForActivityStrip bestDays={bestDays} />

        <ScoringCriteriaDialog>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={[
              "group/info h-auto w-max shrink-0 self-start gap-2 rounded-full border-foreground/[0.07] bg-card py-1 pl-3 pr-1 text-[11.5px] font-medium text-foreground/75",
              "shadow-[0_1px_1px_0_oklch(1_0_0/0.6)_inset]",
              "transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
              "hover:-translate-y-[1px] hover:border-foreground/20 hover:bg-card hover:text-foreground",
              "active:scale-[0.98] sm:self-center",
            ].join(" ")}
          >
            How we score
            <span
              className={[
                "inline-grid size-6 place-items-center rounded-full bg-foreground/[0.06] text-foreground/65 ring-1 ring-foreground/[0.06]",
                "transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
                "group-hover/info:bg-foreground group-hover/info:text-background group-hover/info:ring-foreground",
              ].join(" ")}
              aria-hidden="true"
            >
              <InfoIcon strokeWidth={1.6} aria-hidden="true" className="size-3" />
            </span>
          </Button>
        </ScoringCriteriaDialog>
      </div>

      {/* Per-day grid — auto-fit so the row always fills cleanly */}
      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}
      >
        {rankedDays.map((day, idx) => (
          <DayCard key={day.date} day={day} index={idx + 1} />
        ))}
      </div>
    </section>
  );
}

function formatRange(from?: string, to?: string): string {
  if (!from || !to) return "";
  const f = new Date(`${from}T00:00:00`);
  const t = new Date(`${to}T00:00:00`);
  const month = (d: Date) =>
    new Intl.DateTimeFormat("en", { month: "short" }).format(d);
  const day = (d: Date) =>
    new Intl.DateTimeFormat("en", { day: "numeric" }).format(d);

  if (month(f) === month(t)) {
    return `${month(f)} ${day(f)}–${day(t)}`;
  }
  return `${month(f)} ${day(f)} – ${month(t)} ${day(t)}`;
}
