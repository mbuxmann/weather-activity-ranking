import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { ArrowUpRightIcon, Loader2Icon, SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { citySearchSchema, type CitySearchValues } from "@/schemas/citySearch";

type CitySearchProps = {
  isLoading: boolean;
  onSearch: (city: string) => void;
  defaultCity?: string;
};

export function CitySearch({ isLoading, onSearch, defaultCity = "Cape Town" }: CitySearchProps) {
  const form = useForm<CitySearchValues>({
    resolver: zodResolver(citySearchSchema),
    defaultValues: { city: defaultCity },
  });

  useEffect(() => {
    if (form.getValues("city") !== defaultCity) {
      form.reset({ city: defaultCity });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultCity]);

  const errorMessage = form.formState.errors.city?.message;

  function handleSubmit(values: CitySearchValues) {
    onSearch(values.city.trim());
  }

  return (
    <form
      onSubmit={form.handleSubmit(handleSubmit)}
      className="flex w-full flex-col gap-3"
      noValidate
    >
      <Label
        htmlFor="city-search-input"
        className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground"
      >
        Search a city
      </Label>

      <div className="shell-tray group/pill rounded-full p-1.5 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] focus-within:shadow-[0_0_0_4px_oklch(0.42_0.07_162/0.12)]">
        <div className="flex items-center gap-2 rounded-full bg-card pl-5 pr-1.5 shadow-[0_1px_1px_0_oklch(1_0_0/0.7)_inset,0_1px_2px_0_oklch(0.18_0.015_250/0.04)]">
          <SearchIcon
            strokeWidth={1.4}
            aria-hidden="true"
            className="size-4 shrink-0 text-foreground/55 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-focus-within/pill:scale-110"
          />

          <Input
            id="city-search-input"
            type="text"
            autoComplete="off"
            spellCheck={false}
            placeholder="Try Lisbon, Tokyo, Reykjavík…"
            aria-invalid={errorMessage ? "true" : "false"}
            aria-describedby={errorMessage ? "city-search-error" : undefined}
            className="h-12 flex-1 rounded-none border-0 bg-transparent px-0 py-0 text-[15px] tracking-tight text-foreground shadow-none placeholder:text-muted-foreground/70 focus-visible:border-0 focus-visible:ring-0 disabled:bg-transparent dark:bg-transparent md:text-[15px]"
            {...form.register("city")}
          />

          <Button
            type="submit"
            disabled={isLoading}
            aria-label={isLoading ? "Searching" : "Find best activity days"}
            variant="default"
            className={[
              "group/btn relative h-11 gap-2 rounded-full bg-foreground pl-5 pr-1.5 text-[13px] font-medium text-background",
              "transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]",
              "active:scale-[0.97] disabled:opacity-70",
              "shadow-[0_1px_0_0_oklch(1_0_0/0.18)_inset,0_4px_16px_-4px_oklch(0.18_0.015_250/0.4)]",
              "[a]:hover:bg-foreground hover:bg-foreground/95",
            ].join(" ")}
          >
            <span className="hidden sm:inline">{isLoading ? "Ranking…" : "Rank week"}</span>
            <span
              className={[
                "inline-grid size-8 place-items-center rounded-full bg-background/15 ring-1 ring-background/20",
                "transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]",
                "group-hover/btn:translate-x-[2px] group-hover/btn:-translate-y-[1px] group-hover/btn:scale-[1.06]",
              ].join(" ")}
            >
              {isLoading ? (
                <Loader2Icon
                  aria-hidden="true"
                  className="size-3.5 animate-spin"
                />
              ) : (
                <ArrowUpRightIcon
                  strokeWidth={1.6}
                  aria-hidden="true"
                  className="size-3.5"
                />
              )}
            </span>
          </Button>
        </div>
      </div>

      {errorMessage ? (
        <Alert
          id="city-search-error"
          variant="destructive"
          className="rounded-xl border-destructive/20 bg-destructive/[0.06] px-3 py-2"
        >
          <AlertDescription className="text-[13px] text-destructive">
            {errorMessage}
          </AlertDescription>
        </Alert>
      ) : null}
    </form>
  );
}
