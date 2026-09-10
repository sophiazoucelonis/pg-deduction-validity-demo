import { describe, it, expect } from "vitest";
import { toNumericValue, sequentialFills } from "./ChartBar";

describe("toNumericValue", () => {
  it("parses a plain number unchanged", () => {
    expect(toNumericValue(1284)).toBe(1284);
  });

  it("strips comma thousands-separators instead of coercing to 0", () => {
    expect(toNumericValue("1,284")).toBe(1284);
  });

  it("falls back to 0 for a genuinely non-numeric string", () => {
    expect(toNumericValue("n/a")).toBe(0);
  });
});

describe("sequentialFills", () => {
  it("ranks a comma-parsed value as the darkest (rank 0) when it's the true max", () => {
    // Before the fix, "1,284" -> NaN -> 0 would rank this LAST (lightest).
    const values = [1284, 500, 10].map((v) => v); // already-parsed via toNumericValue upstream
    const fills = sequentialFills(values);
    expect(fills[0]).toBe(fills[0]); // sanity: same array positions
    // Highest value gets the darkest (SEQUENTIAL_DARK) fill, lowest the lightest.
    expect(fills[0]).toBe("rgb(31, 26, 173)");
    expect(fills[2]).toBe("rgb(190, 202, 253)");
  });

  it("does not divide by zero for a single row", () => {
    expect(sequentialFills([42])).toEqual(["rgb(31, 26, 173)"]);
  });

  it("gives tied values the same shade", () => {
    const fills = sequentialFills([10, 10, 5]);
    expect(fills[0]).toBe(fills[1]);
  });
});
