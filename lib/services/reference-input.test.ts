import { describe, expect, it } from "vitest";

import { readCreateReference, readUpdateReference } from "@/lib/services/reference-input";

describe("package type input", () => {
  it("stores an empty tare, net weight, and recommended amount as null", () => {
    const parsed = readCreateReference("package_types", { name: "סל קטן" });
    expect(parsed).toEqual({
      ok: true,
      data: {
        table: "package_types",
        name: "סל קטן",
        tareGrams: null,
        netWeightGrams: null,
        recommendedPackageAmount: null,
        countsInGrowerInventory: true,
      },
    });
  });

  it("rejects a bad recommended amount and keeps a required pallet tare", () => {
    const amount = readCreateReference("package_types", {
      name: "סל קטן",
      recommendedPackageAmount: "0",
    });
    expect(amount).toMatchObject({
      ok: false,
      code: "INVALID",
      field: "recommendedPackageAmount",
    });

    const pallet = readCreateReference("pallet_types", { name: "משטח", tareKilograms: "" });
    expect(pallet).toMatchObject({ ok: false, field: "tareKilograms" });
  });

  it("clears a package tare when the update sends an empty weight", () => {
    const parsed = readUpdateReference("package_types", {
      id: "00000000-0000-4000-8000-000000000001",
      tareKilograms: "",
      netWeightKilograms: "1.5",
      recommendedPackageAmount: "10000",
    });
    expect(parsed).toMatchObject({
      ok: true,
      data: {
        tareGrams: null,
        netWeightGrams: 1500,
        recommendedPackageAmount: 10_000,
      },
    });
  });
});
