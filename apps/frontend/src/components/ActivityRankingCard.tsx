import { ActivityLabel } from "contracts";
import type { ActivityRankingsQuery } from "../api/generated";

type ActivityScore = ActivityRankingsQuery["activityRankings"]["days"][number]["rankings"][number];

type ActivityRankingCardProps = {
  ranking: ActivityScore;
};

export function ActivityRankingCard({ ranking }: ActivityRankingCardProps) {
  return (
    <article className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-lg border border-border/60 bg-muted/30 p-3">
      <div>
        <h3 className="text-base font-semibold">{ActivityLabel[ranking.activity]}</h3>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          {ranking.reason}
        </p>
      </div>
      <strong className="grid size-12 place-items-center rounded-full bg-foreground text-sm font-bold text-background">
        {ranking.score}
      </strong>
    </article>
  );
}
