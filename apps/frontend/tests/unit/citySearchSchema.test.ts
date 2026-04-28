import { describe, expect, it } from "vitest";
import { citySearchSchema } from "../../src/schemas/citySearch";

describe("citySearchSchema", () => {
  // ---------------------------------------------------------------------------
  // Positive tests — valid inputs that SHOULD pass
  // ---------------------------------------------------------------------------
  describe("positive (valid inputs)", () => {
    it("accepts a simple city name", () => {
      const result = citySearchSchema.safeParse({ city: "London" });
      expect(result.success).toBe(true);
    });

    it("accepts a multi-word city name", () => {
      const result = citySearchSchema.safeParse({ city: "New York" });
      expect(result.success).toBe(true);
    });

    it("accepts hyphenated city names", () => {
      const result = citySearchSchema.safeParse({ city: "Stratford-upon-Avon" });
      expect(result.success).toBe(true);
    });

    it("accepts apostrophes in city names", () => {
      const result = citySearchSchema.safeParse({ city: "O'Brien" });
      expect(result.success).toBe(true);
    });

    it("accepts diacritics and accented characters", () => {
      const result = citySearchSchema.safeParse({ city: "São Paulo" });
      expect(result.success).toBe(true);
    });

    it("accepts German umlauts", () => {
      const result = citySearchSchema.safeParse({ city: "München" });
      expect(result.success).toBe(true);
    });

    it("accepts French accented characters", () => {
      const result = citySearchSchema.safeParse({ city: "Montréal" });
      expect(result.success).toBe(true);
    });

    it("accepts the minimum valid length (2 characters)", () => {
      const result = citySearchSchema.safeParse({ city: "Bo" });
      expect(result.success).toBe(true);
    });

    it("accepts names at the maximum length boundary (100 chars)", () => {
      const longCity = "A".repeat(100);
      const result = citySearchSchema.safeParse({ city: longCity });
      expect(result.success).toBe(true);
    });

    it("accepts city names with periods (e.g. St. Louis)", () => {
      const result = citySearchSchema.safeParse({ city: "St. Louis" });
      expect(result.success).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Negative tests — invalid inputs that SHOULD fail
  // ---------------------------------------------------------------------------
  describe("negative (invalid inputs)", () => {
    it("rejects an empty string", () => {
      const result = citySearchSchema.safeParse({ city: "" });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          "Please enter a city or town name."
        );
      }
    });

    it("rejects a single character (below min length)", () => {
      const result = citySearchSchema.safeParse({ city: "A" });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          "City name must be at least 2 characters."
        );
      }
    });

    it("rejects names exceeding 100 characters", () => {
      const tooLong = "A".repeat(101);
      const result = citySearchSchema.safeParse({ city: tooLong });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          "City name must be at most 100 characters."
        );
      }
    });

    it("rejects numeric input", () => {
      const result = citySearchSchema.safeParse({ city: "12345" });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain(
          "City name can only contain letters"
        );
      }
    });

    it("rejects special characters", () => {
      const result = citySearchSchema.safeParse({ city: "London@#$" });
      expect(result.success).toBe(false);
    });

    it("rejects city names with angle brackets (HTML injection)", () => {
      const result = citySearchSchema.safeParse({ city: "<script>alert('xss')</script>" });
      expect(result.success).toBe(false);
    });

    it("rejects city names with SQL injection patterns", () => {
      const result = citySearchSchema.safeParse({ city: "'; DROP TABLE cities; --" });
      expect(result.success).toBe(false);
    });

    it("rejects missing city field entirely", () => {
      const result = citySearchSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it("rejects non-string types for city", () => {
      const result = citySearchSchema.safeParse({ city: 42 });
      expect(result.success).toBe(false);
    });

    it("rejects null city value", () => {
      const result = citySearchSchema.safeParse({ city: null });
      expect(result.success).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Boundary / edge-case tests
  // ---------------------------------------------------------------------------
  describe("boundary and edge cases", () => {
    it("accepts exactly 2 characters (lower boundary)", () => {
      expect(citySearchSchema.safeParse({ city: "AB" }).success).toBe(true);
    });

    it("accepts exactly 100 characters (upper boundary)", () => {
      expect(citySearchSchema.safeParse({ city: "A".repeat(100) }).success).toBe(true);
    });

    it("rejects exactly 101 characters (just over boundary)", () => {
      expect(citySearchSchema.safeParse({ city: "A".repeat(101) }).success).toBe(false);
    });

    it("preserves leading and trailing whitespace in the value (trimming is a consumer concern)", () => {
      // The schema validates the raw input; trimming happens in the form submit handler
      const result = citySearchSchema.safeParse({ city: "  Cape Town  " });
      expect(result.success).toBe(true);
    });

    it("collects all validation errors when multiple rules fail", () => {
      // An empty string fails both min(1) checks
      const result = citySearchSchema.safeParse({ city: "" });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThanOrEqual(1);
      }
    });
  });
});
