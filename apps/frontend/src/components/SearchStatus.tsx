import { Alert, AlertDescription } from "@/components/ui/alert";

type SearchStatusProps = {
  fetching: boolean;
  error: string | null;
};

export function SearchStatus({ fetching, error }: SearchStatusProps) {
  if (error) {
    return (
      <Alert
        variant="destructive"
        className="w-full rounded-2xl border-destructive/20 bg-destructive/6 px-4 py-3"
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
