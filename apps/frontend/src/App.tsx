import { useState } from "react";
import { useQuery } from "urql";
import { CitySearch } from "./components/CitySearch";
import { RankingResults } from "./components/RankingResults";
import {
  ActivityRankingsDocument,
  type ActivityRankingsQuery,
  type ActivityRankingsQueryVariables
} from "./api/generated";
import { getActivityRankingErrorMessage } from "./api/errorMessages";

export function App() {
  const [city, setCity] = useState("Cape Town");
  const [{ data, error, fetching }] = useQuery<ActivityRankingsQuery, ActivityRankingsQueryVariables>({
    query: ActivityRankingsDocument,
    variables: { city },
    pause: !city
  });

  return (
    <main className="app-shell">
      <section className="intro">
        <p>Weather-based activity rankings</p>
        <h1>Find the best day for each activity.</h1>
      </section>

      <CitySearch isLoading={fetching} onSearch={(nextCity) => setCity(nextCity.trim())} />

      {error ? <p className="state state--error">{getActivityRankingErrorMessage(error)}</p> : null}
      {fetching ? <p className="state">Checking the seven-day forecast...</p> : null}
      {data?.activityRankings ? <RankingResults result={data.activityRankings} /> : null}
    </main>
  );
}
