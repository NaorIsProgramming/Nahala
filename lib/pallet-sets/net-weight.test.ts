import { describe, expect, it } from "vitest";

import { kindsForPackageFlow, PACKAGE_FLOW } from "@/lib/pallet-sets/kinds";
import { netWeightGrams } from "@/lib/pallet-sets/net-weight";

describe("package flow", () => {
  it("maps A and B to in and C to none", () => {
    expect(PACKAGE_FLOW).toEqual({ A: "in", B: "in", C: "none" });
    expect(kindsForPackageFlow("in")).toEqual(["A", "B"]);
    expect(kindsForPackageFlow("none")).toEqual(["C"]);
  });
});

describe("net weight", () => {
  it("returns a positive result, an exact zero, and a negative result", () => {
    expect(netWeightGrams(10_000, 100, 20, 500)).toBe(7_500);
    expect(netWeightGrams(1_500, 100, 10, 500)).toBe(0);
    expect(netWeightGrams(1_000, 200, 10, 100)).toBe(-1_100);
  });

  it("treats a missing package tare as zero when the caller passes zero", () => {
    expect(netWeightGrams(5_000, 0, 12, 250)).toBe(4_750);
  });
});
