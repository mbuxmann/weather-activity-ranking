import { useState } from "react";
import { useQuery } from "urql";
import { AppHero } from "./components/AppHero";
import { RankingResults } from "./components/RankingResults";
import { SearchZone } from "./components/SearchZone";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  ActivityRankingsDocument,
  type ActivityRankingsQuery,
  type ActivityRankingsQueryVariables,
} from "./api/generated";
import { getActivityRankingErrorMessage } from "./api/errorMessages";

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
      <div className="grain-overlay relative min-h-dvh overflow-x-hidden">
        <main className="relative z-10 mx-auto w-[min(1200px,calc(100%-32px))] px-2 pb-24 pt-14 sm:pt-20 lg:pt-24">
          <AppHero />

          <SearchZone
            city={city}
            fetching={fetching}
            error={error ? getActivityRankingErrorMessage(error) : null}
            onSearch={(nextCity) => setCity(nextCity.trim())}
          />

          {data?.activityRankings ? (
            <RankingResults key={city} result={data.activityRankings} />
          ) : null}
        </main>
      </div>
    </TooltipProvider>
  );
}
