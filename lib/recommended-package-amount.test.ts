import { describe, expect, it } from "vitest";

import { parseRecommendedPackageAmount } from "@/lib/recommended-package-amount";

describe("parseRecommendedPackageAmount", () => {
  it("accepts an integer from 1 to 10000", () => {
    expect(parseRecommendedPackageAmount("1")).toBe(1);
    expect(parseRecommendedPackageAmount("48")).toBe(48);
    expect(parseRecommendedPackageAmount("10000")).toBe(10_000);
    expect(parseRecommendedPackageAmount(" 12 ")).toBe(12);
  });

  it("rejects an empty, zero, decimal, or oversized count", () => {
    expect(parseRecommendedPackageAmount("")).toBeNull();
    expect(parseRecommendedPackageAmount("0")).toBeNull();
    expect(parseRecommendedPackageAmount("01")).toBeNull();
    expect(parseRecommendedPackageAmount("1.5")).toBeNull();
    expect(parseRecommendedPackageAmount("10001")).toBeNull();
    expect(parseRecommendedPackageAmount("-1")).toBeNull();
  });
});
