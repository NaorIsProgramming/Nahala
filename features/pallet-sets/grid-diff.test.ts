import { describe, expect, it } from "vitest";

import { buildPalletChange, type GridPalletSnapshot, type SubmittedPallet } from "./grid-diff";

const SET_ID = "6ba7b810-9dad-41d1-80b4-00c04fd430c8";
const TYPE_ID = "6ba7b812-9dad-41d1-80b4-00c04fd430c8";

function pallet(id: string, palletNumber: number, grossWeightGrams = 20_000): GridPalletSnapshot {
  return {
    id,
    palletNumber,
    yieldTypeId: TYPE_ID,
    packageTypeId: TYPE_ID,
    palletTypeId: TYPE_ID,
    packageAmount: 10,
    grossWeightGrams,
  };
}

function submitted(id: string | null, palletNumber: number, grossWeightGrams = 20_000): SubmittedPallet {
  return { ...pallet(id ?? "unused", palletNumber, grossWeightGrams), id };
}

describe("pallet grid diff", () => {
  it("packs about 40 new rows into one add list", () => {
    const rows = Array.from({ length: 40 }, (_, index) => submitted(null, index + 1));
    const change = buildPalletChange(SET_ID, 2, [], rows);
    expect(change).toEqual({
      setId: SET_ID,
      revision: 2,
      add: rows.map((row) => ({
        palletNumber: row.palletNumber,
        yieldTypeId: row.yieldTypeId,
        packageTypeId: row.packageTypeId,
        palletTypeId: row.palletTypeId,
        packageAmount: row.packageAmount,
        grossWeightGrams: row.grossWeightGrams,
      })),
      update: [],
      remove: [],
    });
    expect(change?.add[0]).not.toHaveProperty("netWeightGrams");
    expect(change?.add[0]).not.toHaveProperty("packageTareGrams");
  });

  it("keeps the pallet id when a row is edited and mints nothing for that row", () => {
    const id = "6ba7b814-9dad-41d1-80b4-00c04fd430c8";
    const change = buildPalletChange(SET_ID, 3, [pallet(id, 7)], [submitted(id, 7, 21_000)]);
    expect(change).toEqual({
      setId: SET_ID,
      revision: 3,
      add: [],
      update: [{ id, grossWeightGrams: 21_000 }],
      remove: [],
    });
  });

  it("removes every pallet and leaves no adds when the grid is emptied", () => {
    const first = "6ba7b814-9dad-41d1-80b4-00c04fd430c8";
    const second = "6ba7b815-9dad-41d1-80b4-00c04fd430c8";
    const change = buildPalletChange(SET_ID, 4, [pallet(first, 1), pallet(second, 2)], []);
    expect(change).toEqual({
      setId: SET_ID,
      revision: 4,
      add: [],
      update: [],
      remove: [first, second],
    });
  });

  it("returns null when nothing changed", () => {
    const id = "6ba7b814-9dad-41d1-80b4-00c04fd430c8";
    expect(buildPalletChange(SET_ID, 1, [pallet(id, 1)], [submitted(id, 1)])).toBeNull();
  });
});