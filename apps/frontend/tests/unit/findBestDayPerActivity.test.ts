import { describe, expect, it } from "vitest";
import { Activity, findBestDayPerActivity } from "contracts";

describe("findBestDayPerActivity", () => {
  it("returns the highest-scoring day per activity", () => {
    const result = findBestDayPerActivity({
      days: [
        {
          date: "2026-05-01",
          rankings: [
            { activity: Activity.SKIING, score: 80 },
            { activity: Activity.SURFING, score: 30 },
          ],
        },
        {
          date: "2026-05-02",
          rankings: [
            { activity: Activity.SKIING, score: 50 },
            { activity: Activity.SURFING, score: 90 },
          ],
        },
      ],
    });

    expect(result).toEqual([
      { activity: Activity.SKIING, date: "2026-05-01", score: 80 },
      { activity: Activity.SURFING, date: "2026-05-02", score: 90 },
    ]);
  });

  it("breaks ties in favor of the earlier day", () => {
    const result = findBestDayPerActivity({
      days: [
        {
          date: "2026-05-01",
          rankings: [{ activity: Activity.SKIING, score: 75 }],
        },
        {
          date: "2026-05-02",
          rankings: [{ activity: Activity.SKIING, score: 75 }],
        },
      ],
    });

    expect(result).toEqual([
      { activity: Activity.SKIING, date: "2026-05-01", score: 75 },
    ]);
  });

  it("preserves first-seen activity order in the output", () => {
    const result = findBestDayPerActivity({
      days: [
        {
          date: "2026-05-01",
          rankings: [
            { activity: Activity.SURFING, score: 60 },
            { activity: Activity.SKIING, score: 60 },
          ],
        },
      ],
    });

    expect(result.map((entry) => entry.activity)).toEqual([
      Activity.SURFING,
      Activity.SKIING,
    ]);
  });

  it("returns an empty array for an empty forecast", () => {
    expect(findBestDayPerActivity({ days: [] })).toEqual([]);
  });

  it("returns an empty array when no day has any rankings", () => {
    const result = findBestDayPerActivity({
      days: [
        { date: "2026-05-01", rankings: [] },
        { date: "2026-05-02", rankings: [] },
      ],
    });

    expect(result).toEqual([]);
  });

  it("ignores extra fields on input rankings (structural typing)", () => {
    const richInput = {
      days: [
        {
          date: "2026-05-01",
          rankings: [
            { activity: Activity.SKIING, score: 80, reason: "powder day" },
          ],
        },
      ],
    };

    const result = findBestDayPerActivity(richInput);

    expect(result).toEqual([
      { activity: Activity.SKIING, date: "2026-05-01", score: 80 },
    ]);
  });
});
