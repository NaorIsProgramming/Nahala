import { describe, expect, it } from "vitest";

import { netWeightNegative } from "@/lib/services/pallet-set-input";

import {
  clonedPalletNumber,
  gridRowFromSaved,
  gridRowsFromRecord,
  GRID_ROW_COUNT,
  NEGATIVE_NET_MESSAGE,
  packageAmountForType,
  previewNetGrams,
  rowCopiedFrom,
  type GridRow,
  type PackageChoice,
  type PalletTypeChoice,
} from "./grid-rows";

const PACKAGE_ID = "6ba7b812-9dad-41d1-80b4-00c04fd430c8";
const PALLET_TYPE_ID = "6ba7b813-9dad-41d1-80b4-00c04fd430c8";

const packages: PackageChoice[] = [
  { id: PACKAGE_ID, name: "ארגז", tareGrams: null, recommendedPackageAmount: 30 },
  {
    id: PALLET_TYPE_ID,
    name: "ארגז בלי המלצה",
    tareGrams: 500,
    recommendedPackageAmount: null,
  },
];

const palletTypes: PalletTypeChoice[] = [
  { id: PALLET_TYPE_ID, name: "משטח עץ", tareGrams: 10_000 },
  { id: PACKAGE_ID, name: "בלי טרה", tareGrams: 0 },
];

describe("pallet grid rows", () => {
  it("uses the same Hebrew sentence as a negative save", () => {
    expect(NEGATIVE_NET_MESSAGE).toBe(netWeightNegative().message);
  });

  it("previews zero when a missing package tare counts as 0, and does not clamp a negative result", () => {
    expect(
      previewNetGrams(
        {
          packageTypeId: PACKAGE_ID,
          palletTypeId: PALLET_TYPE_ID,
          packageAmount: "4",
          grossWeightKilograms: "10",
        },
        packages,
        palletTypes,
      ),
    ).toBe(0);

    expect(
      previewNetGrams(
        {
          packageTypeId: PALLET_TYPE_ID,
          palletTypeId: PACKAGE_ID,
          packageAmount: "4",
          grossWeightKilograms: "1",
        },
        packages,
        palletTypes,
      ),
    ).toBe(-1000);
  });

  it("replaces the package amount only when the new type has a recommendation", () => {
    expect(packageAmountForType("12", 30)).toBe("30");
    expect(packageAmountForType("12", null)).toBe("12");
  });

  it("numbers clones one and two above the selected pallet", () => {
    expect(clonedPalletNumber("15", 1)).toBe("16");
    expect(clonedPalletNumber("15", 2)).toBe("17");
    expect(clonedPalletNumber("", 1)).toBe("");
  });

  it("copies types and amount into a new row and leaves the number and gross empty", () => {
    const previous: GridRow = {
      key: "kept",
      id: "kept",
      palletNumber: "4",
      yieldTypeId: "yield",
      packageTypeId: PACKAGE_ID,
      palletTypeId: PALLET_TYPE_ID,
      packageAmount: "12",
      grossWeightKilograms: "18.5",
    };
    expect(rowCopiedFrom(previous, "new")).toEqual({
      key: "new",
      id: null,
      palletNumber: "",
      yieldTypeId: "yield",
      packageTypeId: PACKAGE_ID,
      palletTypeId: PALLET_TYPE_ID,
      packageAmount: "12",
      grossWeightKilograms: "",
    });
  });

  it("keeps a saved pallet id and shows its gross weight in kilograms", () => {
    expect(
      gridRowFromSaved({
        id: "kept",
        palletNumber: 4,
        yieldTypeId: "yield",
        packageTypeId: PACKAGE_ID,
        palletTypeId: PALLET_TYPE_ID,
        packageAmount: 12,
        grossWeightGrams: 1500,
      }),
    ).toMatchObject({ id: "kept", key: "kept", grossWeightKilograms: "1.5" });
  });

  it("restores a saved grid, including an empty one", () => {
    expect(gridRowsFromRecord({})).toBeNull();
    expect(gridRowsFromRecord({ [GRID_ROW_COUNT]: "0" })).toEqual([]);
  });
});
