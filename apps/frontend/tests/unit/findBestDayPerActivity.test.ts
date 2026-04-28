import { describe, expect, it } from "vitest";
import { Activity, findBestDayPerActivity } from "contracts";

/**
 * Lives in the frontend test suite (rather than `packages/contracts`)
 * because the contracts package has no test runner of its own. The
 * function under test is consumed by the frontend, so colocating the
 * test here also doubles as a contract test from the consumer side.
 */
describe("findBestDayPerActivity", () => {
  // -------------------------------------------------------------------------
  // Happy path
  // -------------------------------------------------------------------------
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

  // -------------------------------------------------------------------------
  // Tie-break behavior — documented contract: earlier day wins
  // -------------------------------------------------------------------------
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

  // -------------------------------------------------------------------------
  // Stable order — entries appear in the order activities are first seen,
  // which matters for the chip strip / digest list to look the same across
  // cities.
  // -------------------------------------------------------------------------
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

  // -------------------------------------------------------------------------
  // Edge cases
  // -------------------------------------------------------------------------
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
    // Real GraphQL responses carry a `reason` field too. Assigning to a
    // variable first (rather than passing an inline literal) suppresses
    // TS's excess-property check, so this genuinely exercises structural
    // assignability — i.e. proves the contract accepts richer shapes.
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
