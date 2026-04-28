import type { ActivityRankingsQuery } from "../api/generated";

type ActivityScore = ActivityRankingsQuery["activityRankings"]["days"][number]["rankings"][number];

const activityLabels: Record<ActivityScore["activity"], string> = {
  SKIING: "Skiing",
  SURFING: "Surfing",
  OUTDOOR_SIGHTSEEING: "Outdoor sightseeing",
  INDOOR_SIGHTSEEING: "Indoor sightseeing"
};

type ActivityRankingCardProps = {
  ranking: ActivityScore;
};

export function ActivityRankingCard({ ranking }: ActivityRankingCardProps) {
  return (
    <article className="activity-card">
      <div>
        <h3>{activityLabels[ranking.activity]}</h3>
        <p>{ranking.reason}</p>
      </div>
      <strong>{ranking.score}</strong>
    </article>
  );
}
