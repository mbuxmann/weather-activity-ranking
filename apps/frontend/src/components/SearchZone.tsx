import { CitySearch } from "./CitySearch";
import { SearchStatus } from "./SearchStatus";
import { SuggestionChips } from "./SuggestionChips";

type SearchZoneProps = {
  city: string;
  fetching: boolean;
  error: string | null;
  onSearch: (next: string) => void;
};

export function SearchZone({ city, fetching, error, onSearch }: SearchZoneProps) {
  return (
    <section
      aria-label="Search"
      className="relative mt-14 sm:mt-20 animate-rise animate-rise-delay-2"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-65 w-[120%] max-w-205 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-80 blur-3xl"
        style={{
          background:
            "radial-gradient(ellipse at center, oklch(0.42 0.07 162 / 0.12), transparent 65%)",
        }}
      />

      <div className="mx-auto flex max-w-160 flex-col items-stretch gap-5">
        <span className="self-center inline-flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.28em] text-foreground/55">
          <span
            className="block h-px w-6 bg-foreground/20"
            aria-hidden="true"
          />
          Begin here
          <span
            className="block h-px w-6 bg-foreground/20"
            aria-hidden="true"
          />
        </span>

        <CitySearch
          isLoading={fetching}
          onSearch={onSearch}
          defaultCity={city}
        />

        <div className="flex justify-center">
          <SearchStatus fetching={fetching} error={error} />
        </div>

        <SuggestionChips
          activeCity={city}
          disabled={fetching}
          onPick={onSearch}
        />
      </div>
    </section>
  );
}
