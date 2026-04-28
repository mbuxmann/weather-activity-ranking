import { ActivityLabel, type BestDay } from "contracts";
import { displayScore, formatShortWeekday } from "@/lib/rankingHelpers";
import { Badge } from "@/components/ui/badge";
import { ActivityGlyph } from "./ActivityGlyph";

type BestForActivityStripProps = {
  bestDays: BestDay[];
};

/**
 * A quiet summary above the day grid: "Best skiing → Tue · Best surfing
 * → Sat · …". Restores the per-activity insight without competing with
 * the per-day cards. Each entry uses shadcn Badge underneath, with
 * className overrides for our cream-card pill aesthetic.
 */
export function BestForActivityStrip({ bestDays }: BestForActivityStripProps) {
  if (bestDays.length === 0) return null;

  return (
    <div
      className="flex flex-wrap items-center gap-x-3 gap-y-2"
      aria-label="Best day across the week per activity"
    >
      <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
        Best for
      </span>
      <div className="flex flex-wrap gap-1.5">
        {bestDays.map((entry) => (
          <Badge
            key={entry.activity}
            variant="outline"
            className="h-auto gap-2 rounded-full border-foreground/[0.07] bg-card px-2.5 py-1 text-[11.5px] font-medium shadow-[0_1px_1px_0_oklch(1_0_0/0.6)_inset] [a]:hover:bg-card"
          >
            <ActivityGlyph
              activity={entry.activity}
              className="size-4 text-foreground/65"
            />
            <span className="text-foreground/75">
              {ActivityLabel[entry.activity]}
            </span>
            <span className="text-foreground/35" aria-hidden="true">
              ·
            </span>
            <span className="font-semibold text-foreground tabular-nums">
              {formatShortWeekday(entry.date)}
            </span>
            <span className="text-[10px] text-muted-foreground/80 tabular-nums">
              {displayScore(entry.score)}
            </span>
          </Badge>
        ))}
      </div>
    </div>
  );
}
