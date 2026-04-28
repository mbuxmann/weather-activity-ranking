import type { ActivityRankingsData } from "../api/queries";
import { ActivityRankingCard } from "./ActivityRankingCard";

type RankingResultsProps = {
  result: ActivityRankingsData["activityRankings"];
};

export function RankingResults({ result }: RankingResultsProps) {
  return (
    <section className="results" aria-label="Activity rankings">
      <header className="results__header">
        <div>
          <p>Seven-day outlook</p>
          <h2>
            {result.location.name}, {result.location.country}
          </h2>
        </div>
        <span>
          {result.location.latitude.toFixed(2)}, {result.location.longitude.toFixed(2)}
        </span>
      </header>

      <div className="day-grid">
        {result.days.map((day) => (
          <section className="day-panel" key={day.date}>
            <h3>{new Intl.DateTimeFormat("en", { weekday: "short", month: "short", day: "numeric" }).format(new Date(day.date))}</h3>
            <div className="activity-list">
              {day.rankings.map((ranking) => (
                <ActivityRankingCard key={`${day.date}-${ranking.activity}`} ranking={ranking} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}
