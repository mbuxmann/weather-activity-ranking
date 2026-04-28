import type { ReactNode } from "react";
import { Activity, ActivityLabel } from "contracts";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ActivityGlyph } from "./ActivityGlyph";

type ScoringCriteriaDialogProps = {
  children: ReactNode;
};

export function ScoringCriteriaDialog({ children }: ScoringCriteriaDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent
        className="shell-tray w-[min(560px,calc(100vw-32px))] max-w-none gap-0 rounded-[1.75rem] bg-transparent p-1.5 sm:max-w-none [&>button[data-slot=dialog-close]]:right-3 [&>button[data-slot=dialog-close]]:top-3 [&>button[data-slot=dialog-close]]:z-10"
      >
        <div className="shell-core relative flex max-h-[calc(100dvh-60px)] flex-col overflow-hidden rounded-[calc(1.75rem-0.375rem)]">
          <DialogHeader className="gap-2 border-b border-border/60 px-7 pb-5 pt-7 text-left">
            <Badge
              variant="default"
              className="h-auto w-max gap-2 rounded-full bg-primary/10 px-2.5 py-1 text-[9.5px] font-medium uppercase tracking-[0.24em] text-primary ring-1 ring-primary/15 [a]:hover:bg-primary/10"
            >
              <span className="size-1 rounded-full bg-primary" aria-hidden="true" />
              Methodology
            </Badge>
            <DialogTitle className="font-sans text-[clamp(1.4rem,3vw,1.85rem)] font-semibold leading-[1.05] tracking-[-0.03em] text-foreground">
              How we score the week.
            </DialogTitle>
            <DialogDescription className="max-w-[44ch] text-[13.5px] leading-relaxed text-foreground/65">
              Every activity gets a 0&ndash;100 score per day. Each score
              blends the weather signals that matter most for that
              activity &mdash; so an ideal ski day looks nothing like an
              ideal beach day.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-7 py-6">
            <ul className="flex flex-col gap-5">
              {CRITERIA.map((entry) => (
                <CriteriaRow key={entry.activity} entry={entry} />
              ))}
            </ul>
          </div>

          <footer className="flex items-center justify-between gap-3 border-t border-border/60 bg-foreground/[0.015] px-7 py-4 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-primary/70" aria-hidden="true" />
              Forecast data: Open-Meteo
            </span>
            <span className="font-medium tabular-nums text-foreground/55">
              Updated each search · Free
            </span>
          </footer>
        </div>
      </DialogContent>
    </Dialog>
  );
}

type Factor = {
  direction: "+" | "-";
  label: string;
};

type CriteriaEntry = {
  activity: Activity;
  blurb: string;
  factors: Factor[];
};

const CRITERIA: CriteriaEntry[] = [
  {
    activity: Activity.SKIING,
    blurb: "Cold air with fresh snow on the ground.",
    factors: [
      { direction: "+", label: "Cold temperatures (≤ 6 °C)" },
      { direction: "+", label: "Fresh snowfall" },
      { direction: "-", label: "High wind (> 35 kph)" },
    ],
  },
  {
    activity: Activity.SURFING,
    blurb: "Coastal days with rideable swell, useful period, and mild air.",
    factors: [
      { direction: "+", label: "Best wave height: 1–2.5 m" },
      { direction: "+", label: "Marginal wave height: 0.5–1 m or 2.5–4 m" },
      { direction: "+", label: "Longer wave period: ≥ 8 s" },
      { direction: "+", label: "Warmer air: ≥ 15 °C, best at ≥ 20 °C" },
      { direction: "-", label: "Heavy rain: > 15 mm" },
      { direction: "-", label: "No marine forecast: unavailable inland" },
    ],
  },
  {
    activity: Activity.OUTDOOR_SIGHTSEEING,
    blurb: "Comfortable, dry conditions where walking is a pleasure.",
    factors: [
      { direction: "+", label: "Comfortable temperatures (16–28 °C)" },
      { direction: "+", label: "Dry weather (≤ 8 mm rain)" },
      { direction: "-", label: "High wind (> 35 kph)" },
    ],
  },
  {
    activity: Activity.INDOOR_SIGHTSEEING,
    blurb: "The worse it is outside, the better the museum looks.",
    factors: [
      { direction: "+", label: "Heavy rain or strong wind" },
      { direction: "+", label: "Uncomfortable temperatures (< 10 °C or > 32 °C)" },
    ],
  },
];

function CriteriaRow({ entry }: { entry: CriteriaEntry }) {
  return (
    <li className="flex flex-col gap-3 rounded-2xl bg-foreground/[0.025] p-4 ring-1 ring-foreground/[0.05]">
      <header className="flex items-center gap-3">
        <ActivityGlyph activity={entry.activity} className="size-8 text-foreground/80" />
        <div className="flex min-w-0 flex-col">
          <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
            {ActivityLabel[entry.activity]}
          </span>
          <span className="text-[13.5px] font-medium text-foreground/80">
            {entry.blurb}
          </span>
        </div>
      </header>

      <ul className="flex flex-col gap-1.5">
        {entry.factors.map((factor) => (
          <li
            key={`${entry.activity}-${factor.label}`}
            className="flex items-center gap-2.5 text-[12.5px] text-foreground/75"
          >
            <FactorBadge direction={factor.direction} />
            <span>{factor.label}</span>
          </li>
        ))}
      </ul>
    </li>
  );
}

function FactorBadge({ direction }: { direction: "+" | "-" }) {
  const isBoost = direction === "+";
  return (
    <Badge
      variant={isBoost ? "default" : "destructive"}
      aria-label={isBoost ? "boosts score" : "lowers score"}
      className={[
        "h-5 w-5 justify-center rounded-full px-0 text-[11px] font-semibold leading-none tabular-nums",
        isBoost
          ? "bg-primary/10 text-primary ring-1 ring-primary/20 [a]:hover:bg-primary/10"
          : "bg-destructive/10 text-destructive ring-1 ring-destructive/20",
      ].join(" ")}
    >
      {isBoost ? "+" : "−"}
    </Badge>
  );
}
