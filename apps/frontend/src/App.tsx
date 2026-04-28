import { useState } from "react";
import { useQuery } from "urql";
import { CitySearch } from "./components/CitySearch";
import { RankingResults } from "./components/RankingResults";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  ActivityRankingsDocument,
  type ActivityRankingsQuery,
  type ActivityRankingsQueryVariables,
} from "./api/generated";
import { getActivityRankingErrorMessage } from "./api/errorMessages";

const SUGGESTION_CITIES = ["Lisbon", "Tokyo", "Reykjavík", "Buenos Aires"] as const;

export function App() {
  const [city, setCity] = useState("Cape Town");
  const [{ data, error, fetching }] = useQuery<
    ActivityRankingsQuery,
    ActivityRankingsQueryVariables
  >({
    query: ActivityRankingsDocument,
    variables: { city },
    pause: !city,
  });

  return (
    <TooltipProvider delayDuration={150}>
      <div className="grain-overlay relative min-h-[100dvh] overflow-x-hidden">
        <main className="relative z-10 mx-auto w-[min(1200px,calc(100%-32px))] px-2 pb-24 pt-14 sm:pt-20 lg:pt-24">
          {/* ───────────────────  HERO  ─────────────────── */}
          <section className="flex flex-col gap-6 animate-rise">
            <Badge
              variant="outline"
              className="h-auto rounded-full border-foreground/[0.06] bg-foreground/[0.04] px-3 py-1 text-[10px] font-medium uppercase tracking-[0.24em] text-foreground/65"
            >
              <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
              Weather × Activities
            </Badge>

            <h1 className="max-w-[18ch] text-[clamp(2.6rem,7.5vw,5.4rem)] font-semibold leading-[0.94] tracking-[-0.045em] text-foreground">
              Where the week
              <br />
              <span className="text-foreground/55">goes well.</span>
            </h1>

            <p className="max-w-[52ch] text-[15px] leading-relaxed text-foreground/70 sm:text-[17px]">
              Type a city. We read the seven-day forecast and surface the single best day
              for each activity — skiing, surfing, outdoor sightseeing, or staying warm
              and indoors.
            </p>
          </section>

          {/* ───────────────────  SEARCH ZONE  ─────────────────── */}
          <SearchZone
            city={city}
            fetching={fetching}
            error={error ? getActivityRankingErrorMessage(error) : null}
            onSearch={(nextCity) => setCity(nextCity.trim())}
          />

          {/* ───────────────────  RESULTS  ─────────────────── */}
          {data?.activityRankings ? (
            <RankingResults key={city} result={data.activityRankings} />
          ) : null}
        </main>
      </div>
    </TooltipProvider>
  );
}

/* -------------------------------------------------------------------------- */
/*  Search Zone — eyebrow, ambient under-glow, search, status, chips          */
/* -------------------------------------------------------------------------- */

type SearchZoneProps = {
  city: string;
  fetching: boolean;
  error: string | null;
  onSearch: (next: string) => void;
};

function SearchZone({ city, fetching, error, onSearch }: SearchZoneProps) {
  return (
    <section
      aria-label="Search"
      className="relative mt-14 sm:mt-20 animate-rise animate-rise-delay-2"
    >
      {/* Ambient under-glow — pure decorative, no interactivity */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[260px] w-[120%] max-w-[820px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-80 blur-3xl"
        style={{
          background:
            "radial-gradient(ellipse at center, oklch(0.42 0.07 162 / 0.12), transparent 65%)",
        }}
      />

      <div className="mx-auto flex max-w-[640px] flex-col items-stretch gap-5">
        {/* Eyebrow */}
        <span className="self-center inline-flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.28em] text-foreground/55">
          <span className="block h-px w-6 bg-foreground/20" aria-hidden="true" />
          Begin here
          <span className="block h-px w-6 bg-foreground/20" aria-hidden="true" />
        </span>

        {/* The pill itself */}
        <CitySearch isLoading={fetching} onSearch={onSearch} defaultCity={city} />

        {/* Status line */}
        <div className="flex justify-center">
          <StatusLine fetching={fetching} error={error} />
        </div>

        {/* Suggestion chips */}
        <SuggestionChips activeCity={city} disabled={fetching} onPick={onSearch} />
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Status line — shadcn Alert for errors, plain text for fetching/idle       */
/* -------------------------------------------------------------------------- */

type StatusLineProps = {
  fetching: boolean;
  error: string | null;
};

function StatusLine({ fetching, error }: StatusLineProps) {
  if (error) {
    return (
      <Alert
        variant="destructive"
        className="w-full rounded-2xl border-destructive/20 bg-destructive/[0.06] px-4 py-3"
      >
        <span
          className="mt-1.5 size-1.5 shrink-0 rounded-full bg-destructive"
          aria-hidden="true"
        />
        <AlertDescription className="text-[13px] leading-relaxed text-destructive">
          {error}
        </AlertDescription>
      </Alert>
    );
  }

  if (fetching) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex items-center gap-2.5 text-[13px] text-muted-foreground"
      >
        <span className="relative flex size-2">
          <span className="absolute inset-0 animate-ping rounded-full bg-primary/60" />
          <span className="relative size-2 rounded-full bg-primary" />
        </span>
        Reading the seven-day forecast…
      </div>
    );
  }

  return (
    <p className="text-[12px] text-muted-foreground/75">
      Forecasts via Open-Meteo · Free, no account needed.
    </p>
  );
}

/* -------------------------------------------------------------------------- */
/*  Suggestion chips — shadcn Button with custom pill styling                 */
/* -------------------------------------------------------------------------- */

type SuggestionChipsProps = {
  activeCity: string;
  disabled: boolean;
  onPick: (city: string) => void;
};

function SuggestionChips({ activeCity, disabled, onPick }: SuggestionChipsProps) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
      <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground/80">
        Try
      </span>
      {SUGGESTION_CITIES.map((suggestion, idx) => {
        const isActive = suggestion.toLowerCase() === activeCity.toLowerCase();
        const delayClass =
          ["animate-rise-delay-2", "animate-rise-delay-3", "animate-rise-delay-4", "animate-rise-delay-5"][idx] ??
          "animate-rise-delay-2";

        return (
          <Button
            key={suggestion}
            type="button"
            disabled={disabled}
            onClick={() => onPick(suggestion)}
            aria-pressed={isActive}
            variant={isActive ? "default" : "outline"}
            size="sm"
            className={[
              "h-auto gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-medium",
              "transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.97]",
              "animate-rise",
              delayClass,
              isActive
                ? "bg-foreground text-background ring-1 ring-foreground shadow-[0_1px_0_0_oklch(1_0_0/0.18)_inset,0_4px_14px_-4px_oklch(0.18_0.015_250/0.35)]"
                : "border-foreground/[0.08] bg-card/80 text-foreground/80 ring-1 ring-foreground/[0.08] backdrop-blur-sm hover:-translate-y-[1px] hover:bg-card hover:text-foreground hover:ring-foreground/20 shadow-[0_1px_1px_0_oklch(1_0_0/0.7)_inset]",
            ].join(" ")}
          >
            {isActive ? (
              <span
                className="size-1.5 shrink-0 rounded-full bg-primary-foreground/80"
                aria-hidden="true"
              />
            ) : null}
            {suggestion}
          </Button>
        );
      })}
    </div>
  );
}
