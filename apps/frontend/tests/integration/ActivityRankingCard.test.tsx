import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ActivityRankingCard } from "../../src/components/ActivityRankingCard";
import type { ActivityRankingsQuery } from "../../src/api/generated";

type Ranking =
  ActivityRankingsQuery["activityRankings"]["days"][number]["rankings"][number];

const baseRanking: Ranking = {
  activity: "SURFING",
  score: 85,
  reason: "Great wave conditions expected with offshore winds.",
};

describe("ActivityRankingCard", () => {
  // -------------------------------------------------------------------------
  // Positive — correct rendering
  // -------------------------------------------------------------------------
  describe("positive (correct rendering)", () => {
    it("renders the human-readable activity label", () => {
      render(<ActivityRankingCard ranking={baseRanking} />);

      expect(screen.getByText("Surfing")).toBeInTheDocument();
    });

    it("displays the score", () => {
      render(<ActivityRankingCard ranking={baseRanking} />);

      expect(screen.getByText("85")).toBeInTheDocument();
    });

    it("displays the reason text", () => {
      render(<ActivityRankingCard ranking={baseRanking} />);

      expect(
        screen.getByText("Great wave conditions expected with offshore winds.")
      ).toBeInTheDocument();
    });

    it("wraps content in an article element for semantic HTML", () => {
      render(<ActivityRankingCard ranking={baseRanking} />);

      expect(screen.getByRole("article")).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // All activity types render correct labels
  // -------------------------------------------------------------------------
  describe("activity label mapping", () => {
    const labelCases: Array<[Ranking["activity"], string]> = [
      ["SKIING", "Skiing"],
      ["SURFING", "Surfing"],
      ["OUTDOOR_SIGHTSEEING", "Outdoor sightseeing"],
      ["INDOOR_SIGHTSEEING", "Indoor sightseeing"],
    ];

    it.each(labelCases)(
      "maps %s → '%s'",
      (activity, expectedLabel) => {
        render(
          <ActivityRankingCard
            ranking={{ ...baseRanking, activity }}
          />
        );

        expect(screen.getByText(expectedLabel)).toBeInTheDocument();
      }
    );
  });

  // -------------------------------------------------------------------------
  // Edge cases
  // -------------------------------------------------------------------------
  describe("edge cases", () => {
    it("renders a score of zero", () => {
      render(
        <ActivityRankingCard ranking={{ ...baseRanking, score: 0 }} />
      );

      expect(screen.getByText("0")).toBeInTheDocument();
    });

    it("renders a perfect score of 100", () => {
      render(
        <ActivityRankingCard ranking={{ ...baseRanking, score: 100 }} />
      );

      expect(screen.getByText("100")).toBeInTheDocument();
    });

    it("renders a long reason text without truncation", () => {
      const longReason =
        "Extended forecast shows sustained wind patterns from the southwest with wave heights reaching 2-3 meters, " +
        "ideal water temperature of 18°C, and minimal cross-currents making conditions perfect for intermediate surfers.";
      render(
        <ActivityRankingCard
          ranking={{ ...baseRanking, reason: longReason }}
        />
      );

      expect(screen.getByText(longReason)).toBeInTheDocument();
    });
  });
});
