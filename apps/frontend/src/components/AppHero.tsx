import { Badge } from "@/components/ui/badge";

export function AppHero() {
  return (
    <section className="flex flex-col gap-6 animate-rise">
      <Badge
        variant="outline"
        className="h-auto rounded-full border-foreground/6 bg-foreground/4 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.24em] text-foreground/65"
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
        Type a city. We read the seven-day forecast and surface the single best
        day for each activity — skiing, surfing, outdoor sightseeing, or staying
        warm and indoors.
      </p>
    </section>
  );
}
