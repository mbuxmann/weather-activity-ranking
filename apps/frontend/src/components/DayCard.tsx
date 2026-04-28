import { ActivityLabel } from "contracts";
import {
  displayScore,
  formatBestDay,
  normalizeScore,
  type RankedDay,
  type Ranking,
} from "@/lib/rankingHelpers";
import { ActivityGlyph } from "./ActivityGlyph";

type DayCardProps = {
  day: RankedDay;
  /** 1-based index used to stagger the entry animation. */
  index: number;
};

/**
 * One card per forecast day. Activities are rendered in the order
 * supplied — the backend (and our `buildRankedDays` safeguard) sorts
 * them best → worst, so the user reads "what to do today" top-down.
 *
 * Visual hierarchy:
 *   • Day header (huge weekday + date subscript)
 *   • Winner: featured row in a primary-tinted block, with reason
 *   • Runners-up: 3 compact rows, hover-tooltip exposes their reason
 */
export function DayCard({ day, index }: DayCardProps) {
  const { weekday, date } = formatBestDay(day.date);
  const [winner, ...runnersUp] = day.rankings;

  if (!winner) return null;

  const delayClass =
    [
      "animate-rise-delay-1",
      "animate-rise-delay-2",
      "animate-rise-delay-3",
      "animate-rise-delay-4",
      "animate-rise-delay-5",
    ][Math.min(index - 1, 4)] ?? "animate-rise-delay-1";

  return (
    <article
      className={[
        "shell-tray group relative rounded-[1.25rem] p-1 animate-rise",
        delayClass,
      ].join(" ")}
      aria-labelledby={`day-${day.date}-title`}
    >
      <div className="shell-core relative flex h-full flex-col gap-4 rounded-[calc(1.25rem-0.25rem)] p-4 sm:p-5">
        {/* Header */}
        <header className="flex items-baseline justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <h3
              id={`day-${day.date}-title`}
              className="text-[clamp(1.5rem,2.4vw,1.85rem)] font-semibold leading-none tracking-[-0.03em] text-foreground"
            >
              {weekday}
            </h3>
            <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
              {date}
            </p>
          </div>
        </header>

        {/* Winner — featured block */}
        <WinnerBlock ranking={winner} />

        {/* Runners-up */}
        {runnersUp.length > 0 ? (
          <ul className="flex flex-col gap-px overflow-hidden rounded-xl ring-1 ring-foreground/[0.06]">
            {runnersUp.map((ranking) => (
              <RunnerUpRow key={ranking.activity} ranking={ranking} />
            ))}
          </ul>
        ) : null}
      </div>
    </article>
  );
}

/* -------------------------------------------------------------------------- */
/*  Winner block — primary-tinted, the day's headline answer                  */
/* -------------------------------------------------------------------------- */

function WinnerBlock({ ranking }: { ranking: Ranking }) {
  const fraction = normalizeScore(ranking.score);
  const display = displayScore(ranking.score);
  const label = ActivityLabel[ranking.activity];

  return (
    <div
      className="relative flex items-center justify-between gap-3 overflow-hidden rounded-xl bg-primary/[0.06] p-3.5 ring-1 ring-primary/15"
      title={ranking.reason}
      aria-label={`Top pick: ${label}, score ${display} out of 10. ${ranking.reason}`}
    >
      {/* Subtle bar at the top encoding the score */}
      <span
        className="pointer-events-none absolute inset-x-0 top-0 h-[2px] origin-left bg-primary/70"
        style={{ transform: `scaleX(${fraction})` }}
        aria-hidden="true"
      />

      <div className="flex items-center gap-2.5 min-w-0">
        <ActivityGlyph activity={ranking.activity} className="size-7 text-primary" />
        <div className="flex min-w-0 flex-col">
          <span className="text-[9.5px] font-medium uppercase tracking-[0.24em] text-primary/85">
            Top pick
          </span>
          <span className="truncate text-[14px] font-semibold leading-tight text-foreground">
            {label}
          </span>
        </div>
      </div>

      <span className="shrink-0 text-[20px] font-semibold tracking-tight tabular-nums text-foreground">
        {display}
        <span className="text-[11px] font-medium text-muted-foreground/80">/10</span>
      </span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Runner-up row — compact, reason on hover via title                        */
/* -------------------------------------------------------------------------- */

function RunnerUpRow({ ranking }: { ranking: Ranking }) {
  const fraction = normalizeScore(ranking.score);
  const display = displayScore(ranking.score);

  return (
    <li
      title={ranking.reason}
      aria-label={`${ActivityLabel[ranking.activity]} score ${display} out of 10. ${ranking.reason}`}
      className="relative flex items-center justify-between gap-3 bg-card px-3 py-2 transition-colors duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-foreground/[0.025]"
    >
      {/* Underlying score-bar fill — quiet, behind the text */}
      <span
        className="pointer-events-none absolute inset-y-0 left-0 origin-left bg-foreground/[0.04]"
        style={{ width: `${fraction * 100}%` }}
        aria-hidden="true"
      />

      <div className="relative z-10 flex items-center gap-2.5 min-w-0">
        <ActivityGlyph activity={ranking.activity} className="size-5 text-foreground/60" />
        <span className="truncate text-[12.5px] font-medium text-foreground/85">
          {ActivityLabel[ranking.activity]}
        </span>
      </div>

      <span className="relative z-10 text-[12.5px] font-medium tabular-nums text-foreground/65">
        {display}
      </span>
    </li>
  );
}
