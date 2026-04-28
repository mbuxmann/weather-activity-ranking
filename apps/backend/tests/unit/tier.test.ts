import { describe, expect, it } from "vitest";
import { tier } from "../../src/domain/ranking/tier.js";

describe("tier", () => {
  it("returns the points of the first matching rule", () => {
    const points = tier(5, [
      { when: (v) => v <= 2, points: 35 },
      { when: (v) => v <= 6, points: 20 },
      { when: (v) => v <= 10, points: 10 }
    ]);

    expect(points).toBe(20);
  });

  it("returns 0 when no rule matches", () => {
    const points = tier(100, [
      { when: (v) => v < 0, points: 50 },
      { when: (v) => v < 10, points: 25 }
    ]);

    expect(points).toBe(0);
  });

  it("returns 0 for an empty rule list", () => {
    expect(tier(5, [])).toBe(0);
  });

  it("evaluates rules in order — earlier rules win on overlap", () => {
    const points = tier(1, [
      { when: () => true, points: 100 },
      { when: () => true, points: 50 }
    ]);

    expect(points).toBe(100);
  });

  it("does not mutate the rule list", () => {
    const rules = [{ when: (v: number) => v > 0, points: 5 }];
    const before = [...rules];

    tier(1, rules);

    expect(rules).toEqual(before);
  });
});
