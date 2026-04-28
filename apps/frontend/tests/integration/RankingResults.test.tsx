import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { RankingResults } from "../../src/components/RankingResults";
import type { ActivityRankingsQuery } from "../../src/api/generated";

type Result = ActivityRankingsQuery["activityRankings"];

/**
 * Mock data — 3 days × 4 activities, each day's rankings already sorted
 * descending by score (mirroring the backend's contract behavior).
 *   day 1 winner: SURFING (92)
 *   day 2 winner: OUTDOOR_SIGHTSEEING (78)
 *   day 3 winner: SKIING (88)
 */
const mockResult: Result = {
  location: {
    name: "Cape Town",
    country: "South Africa",
    latitude: -33.9249,
    longitude: 18.4241,
  },
  days: [
    {
      date: "2025-07-01",
      rankings: [
        { activity: "SURFING", score: 92, reason: "Perfect swell" },
        { activity: "OUTDOOR_SIGHTSEEING", score: 60, reason: "Bright skies" },
        { activity: "INDOOR_SIGHTSEEING", score: 40, reason: "Mild day" },
        { activity: "SKIING", score: 15, reason: "No snow" },
      ],
    },
    {
      date: "2025-07-02",
      rankings: [
        { activity: "OUTDOOR_SIGHTSEEING", score: 78, reason: "Mild weather" },
        { activity: "INDOOR_SIGHTSEEING", score: 65, reason: "Comfortable indoors" },
        { activity: "SURFING", score: 50, reason: "Smaller swell" },
        { activity: "SKIING", score: 10, reason: "Still no snow" },
      ],
    },
    {
      date: "2025-07-03",
      rankings: [
        { activity: "SKIING", score: 88, reason: "Heavy fresh snowfall" },
        { activity: "INDOOR_SIGHTSEEING", score: 70, reason: "Cozy galleries" },
        { activity: "OUTDOOR_SIGHTSEEING", score: 30, reason: "Cold and grey" },
        { activity: "SURFING", score: 20, reason: "Flat seas" },
      ],
    },
  ],
};

describe("RankingResults", () => {
  // -------------------------------------------------------------------------
  // Location header
  // -------------------------------------------------------------------------
  describe("location header", () => {
    it("renders the city name and country", () => {
      render(<RankingResults result={mockResult} />);

      const heading = screen.getByRole("heading", { level: 2 });
      expect(heading).toHaveTextContent(/Cape Town/);
      expect(heading).toHaveTextContent(/South Africa/);
    });

    it("renders coordinates as cardinal pills", () => {
      render(<RankingResults result={mockResult} />);

      expect(screen.getByText("-33.92° N")).toBeInTheDocument();
      expect(screen.getByText("18.42° E")).toBeInTheDocument();
    });

    it("renders the seven-day eyebrow heading", () => {
      render(<RankingResults result={mockResult} />);

      expect(screen.getByText(/Seven-day outlook/i)).toBeInTheDocument();
    });

    it("uses an aria-label for accessibility", () => {
      render(<RankingResults result={mockResult} />);

      expect(
        screen.getByRole("region", { name: "Activity rankings" })
      ).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Per-day grid — one card per day, activities sorted within
  // -------------------------------------------------------------------------
  describe("per-day grid", () => {
    it("renders one card per forecast day", () => {
      render(<RankingResults result={mockResult} />);

      const articles = screen.getAllByRole("article");
      expect(articles).toHaveLength(mockResult.days.length);
    });

    it("exposes the winner's reason via accessible name (no longer visible text)", () => {
      render(<RankingResults result={mockResult} />);

      // The winner's reason is now in aria-label / title rather than as
      // visible body text — keeps it accessible without visual clutter.
      expect(
        screen.getByLabelText(/Top pick: Surfing.*Perfect swell/i)
      ).toBeInTheDocument();
      expect(
        screen.getByLabelText(/Top pick: Outdoor sightseeing.*Mild weather/i)
      ).toBeInTheDocument();
      expect(
        screen.getByLabelText(/Top pick: Skiing.*Heavy fresh snowfall/i)
      ).toBeInTheDocument();
    });

    it("marks the winning activity as 'Top pick' on every card", () => {
      render(<RankingResults result={mockResult} />);

      expect(screen.getAllByText(/top pick/i)).toHaveLength(mockResult.days.length);
    });

    it("shows scores rated out of 10 (one decimal)", () => {
      render(<RankingResults result={mockResult} />);

      // Winner block aria-labels — 92 → 9.2, 78 → 7.8, 88 → 8.8
      expect(
        screen.getAllByLabelText(/score 9\.2 out of 10/i).length
      ).toBeGreaterThan(0);
      expect(
        screen.getAllByLabelText(/score 7\.8 out of 10/i).length
      ).toBeGreaterThan(0);
      expect(
        screen.getAllByLabelText(/score 8\.8 out of 10/i).length
      ).toBeGreaterThan(0);
    });

    it("lists each activity inside every day card", () => {
      render(<RankingResults result={mockResult} />);

      // Each activity label appears once per day card (4 × 3 days = 12 total)
      // — it doesn't matter which activity is winner vs runner-up, all four
      // appear in every card.
      const articles = screen.getAllByRole("article");
      for (const article of articles) {
        const scoped = within(article);
        expect(scoped.getByText(/Outdoor sightseeing/i)).toBeInTheDocument();
        expect(scoped.getByText(/Surfing/i)).toBeInTheDocument();
        expect(scoped.getByText(/Skiing/i)).toBeInTheDocument();
        expect(scoped.getByText(/Indoor sightseeing/i)).toBeInTheDocument();
      }
    });

    it("exposes runner-up reasons via accessible name (title/aria-label)", () => {
      render(<RankingResults result={mockResult} />);

      // Scope to day 1's article so we don't conflate identical activity
      // labels across days (e.g. "Skiing" appears in every card).
      const [day1] = screen.getAllByRole("article");
      const scoped = within(day1);

      expect(
        scoped.getByLabelText(/Outdoor sightseeing.*Bright skies/i)
      ).toBeInTheDocument();
      expect(
        scoped.getByLabelText(/Skiing.*No snow/i)
      ).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Best-for-activity summary strip
  // -------------------------------------------------------------------------
  describe("summary strip", () => {
    it("renders a 'Best for' summary above the grid", () => {
      render(<RankingResults result={mockResult} />);

      expect(
        screen.getByLabelText(/Best day across the week per activity/i)
      ).toBeInTheDocument();
      expect(screen.getByText(/Best for/i)).toBeInTheDocument();
    });

    it("includes a chip for each activity with its winning short weekday", () => {
      render(<RankingResults result={mockResult} />);

      const strip = screen.getByLabelText(/Best day across the week per activity/i);
      const scoped = within(strip);

      // Best per activity in mock data:
      //   SURFING → day 1 (Tue) score 9.2
      //   OUTDOOR_SIGHTSEEING → day 2 (Wed) score 7.8
      //   INDOOR_SIGHTSEEING → day 3 (Thu) score 7.0
      //   SKIING → day 3 (Thu) score 8.8
      const tue = new Intl.DateTimeFormat("en", { weekday: "short" }).format(
        new Date("2025-07-01T00:00:00")
      );
      const wed = new Intl.DateTimeFormat("en", { weekday: "short" }).format(
        new Date("2025-07-02T00:00:00")
      );
      const thu = new Intl.DateTimeFormat("en", { weekday: "short" }).format(
        new Date("2025-07-03T00:00:00")
      );

      expect(scoped.getByText(tue)).toBeInTheDocument(); // Surfing's day
      expect(scoped.getByText(wed)).toBeInTheDocument(); // Outdoor's day
      // Skiing AND Indoor both peak on day 3 (Thu) → at least 2 occurrences
      expect(scoped.getAllByText(thu).length).toBeGreaterThanOrEqual(2);
    });
  });

  // -------------------------------------------------------------------------
  // Methodology dialog — explains the scoring criteria
  // -------------------------------------------------------------------------
  describe("methodology dialog", () => {
    it("renders a 'How we score' trigger button in the header", () => {
      render(<RankingResults result={mockResult} />);

      expect(
        screen.getByRole("button", { name: /how we score/i })
      ).toBeInTheDocument();
    });

    it("opens a modal explaining each activity's criteria when clicked", async () => {
      const user = userEvent.setup();
      render(<RankingResults result={mockResult} />);

      // Closed by default — title not yet in document
      expect(
        screen.queryByRole("heading", { name: /how we score the week/i })
      ).not.toBeInTheDocument();

      await user.click(
        screen.getByRole("button", { name: /how we score/i })
      );

      // Dialog open — Radix renders content in a portal, but it's still
      // queryable via screen
      const dialog = await screen.findByRole("dialog");
      expect(
        within(dialog).getByRole("heading", { name: /how we score the week/i })
      ).toBeInTheDocument();

      // All four activities listed
      expect(within(dialog).getByText(/Skiing/i)).toBeInTheDocument();
      expect(within(dialog).getByText(/Surfing/i)).toBeInTheDocument();
      expect(within(dialog).getByText(/Outdoor sightseeing/i)).toBeInTheDocument();
      expect(within(dialog).getByText(/Indoor sightseeing/i)).toBeInTheDocument();
    });

    it("closes when the close button is pressed", async () => {
      const user = userEvent.setup();
      render(<RankingResults result={mockResult} />);

      await user.click(
        screen.getByRole("button", { name: /how we score/i })
      );
      const dialog = await screen.findByRole("dialog");
      await user.click(within(dialog).getByRole("button", { name: /close/i }));

      // Radix removes the dialog from the DOM after the close animation;
      // assert it disappears
      await screen.findByRole("button", { name: /how we score/i });
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Edge cases
  // -------------------------------------------------------------------------
  describe("edge cases", () => {
    it("renders correctly with a single day of data", () => {
      const singleDayResult: Result = {
        ...mockResult,
        days: [mockResult.days[0]],
      };

      render(<RankingResults result={singleDayResult} />);

      const articles = screen.getAllByRole("article");
      expect(articles).toHaveLength(1);
    });

    it("renders coordinates with correct precision (2 decimal places)", () => {
      const preciseResult: Result = {
        ...mockResult,
        location: {
          ...mockResult.location,
          latitude: 51.507222,
          longitude: -0.127647,
        },
      };

      render(<RankingResults result={preciseResult} />);

      expect(screen.getByText("51.51° N")).toBeInTheDocument();
      expect(screen.getByText("-0.13° E")).toBeInTheDocument();
    });
  });
});
