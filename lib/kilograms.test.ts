import { describe, expect, it } from "vitest";

import { formatGramsAsKilograms, parseKilogramsToGrams } from "@/lib/kilograms";

describe("kilograms", () => {
  it("converts with integer arithmetic", () => {
    expect(parseKilogramsToGrams("0")).toBe(0);
    expect(parseKilogramsToGrams("1.25")).toBe(1250);
    expect(parseKilogramsToGrams("1.005")).toBe(1005);
    expect(parseKilogramsToGrams("0.001")).toBe(1);
    expect(parseKilogramsToGrams("100")).toBe(100_000);
    expect(parseKilogramsToGrams("100.000")).toBe(100_000);
    expect(parseKilogramsToGrams(" 1.5 ")).toBe(1500);
  });

  it("rejects values the screen must not store", () => {
    expect(parseKilogramsToGrams("100.001")).toBeNull();
    expect(parseKilogramsToGrams("1.2345")).toBeNull();
    expect(parseKilogramsToGrams("")).toBeNull();
    expect(parseKilogramsToGrams("-1")).toBeNull();
    expect(parseKilogramsToGrams("1e2")).toBeNull();
    expect(parseKilogramsToGrams("1,5")).toBeNull();
  });

  it("formats grams back to kilograms", () => {
    expect(formatGramsAsKilograms(0)).toBe("0");
    expect(formatGramsAsKilograms(1)).toBe("0.001");
    expect(formatGramsAsKilograms(10)).toBe("0.01");
    expect(formatGramsAsKilograms(1500)).toBe("1.5");
    expect(formatGramsAsKilograms(100_000)).toBe("100");
    expect(parseKilogramsToGrams(formatGramsAsKilograms(1005))).toBe(1005);
  });
});
