import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTtlCache } from "../../src/lib/cache.js";

describe("createTtlCache", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns undefined for missing keys", () => {
    const cache = createTtlCache<string>(1000);

    expect(cache.get("nope")).toBeUndefined();
  });

  it("returns stored values within their TTL", () => {
    const cache = createTtlCache<string>(1000);
    cache.set("k", "v");

    expect(cache.get("k")).toBe("v");
  });

  it("expires values after the default TTL", () => {
    const cache = createTtlCache<string>(1000);
    cache.set("k", "v");

    vi.advanceTimersByTime(999);
    expect(cache.get("k")).toBe("v");

    vi.advanceTimersByTime(2);
    expect(cache.get("k")).toBeUndefined();
  });

  it("respects a per-set TTL override", () => {
    const cache = createTtlCache<string>(1000);
    cache.set("k", "v", 5000);

    vi.advanceTimersByTime(4000);
    expect(cache.get("k")).toBe("v");

    vi.advanceTimersByTime(1500);
    expect(cache.get("k")).toBeUndefined();
  });

  it("can store nullish values distinctly from missing keys", () => {
    const cache = createTtlCache<string | null>(1000);
    cache.set("k", null);

    expect(cache.get("k")).toBeNull();
    expect(cache.get("missing")).toBeUndefined();
  });

  it("overwrites the value and resets the expiry on re-set", () => {
    const cache = createTtlCache<string>(1000);
    cache.set("k", "first");

    vi.advanceTimersByTime(800);
    cache.set("k", "second");

    vi.advanceTimersByTime(800);
    expect(cache.get("k")).toBe("second");

    vi.advanceTimersByTime(300);
    expect(cache.get("k")).toBeUndefined();
  });
});
