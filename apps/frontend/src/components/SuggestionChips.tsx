import { Button } from "@/components/ui/button";

const SUGGESTION_CITIES = [
  "Lisbon",
  "Tokyo",
  "Reykjavík",
  "Buenos Aires",
] as const;

type SuggestionChipsProps = {
  activeCity: string;
  disabled: boolean;
  onPick: (city: string) => void;
};

export function SuggestionChips({
  activeCity,
  disabled,
  onPick,
}: SuggestionChipsProps) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
      <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground/80">
        Try
      </span>
      {SUGGESTION_CITIES.map((suggestion, idx) => {
        const isActive = suggestion.toLowerCase() === activeCity.toLowerCase();
        const delayClass =
          [
            "animate-rise-delay-2",
            "animate-rise-delay-3",
            "animate-rise-delay-4",
            "animate-rise-delay-5",
          ][idx] ?? "animate-rise-delay-2";

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
