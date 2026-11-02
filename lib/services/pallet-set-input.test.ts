import { describe, expect, it } from "vitest";

import {
  readAddPallets,
  readCreatePalletSet,
  readListPalletSets,
} from "@/lib/services/pallet-set-input";

const pallet = {
  palletNumber: 1,
  yieldTypeId: "00000000-0000-4000-8000-000000000001",
  packageTypeId: "00000000-0000-4000-8000-000000000002",
  palletTypeId: "00000000-0000-4000-8000-000000000003",
  packageAmount: 10,
  grossWeightGrams: 20_000,
};

const header = {
  kind: "A",
  referenceNumber: 12,
  growerId: "00000000-0000-4000-8000-000000000004",
  receivedOn: "2026-11-02",
};

describe("pallet set input", () => {
  it("rejects net weight and tare fields", () => {
    expect(
      readCreatePalletSet({
        ...header,
        pallets: [{ ...pallet, netWeightGrams: 1, packageTareGrams: 2, palletTareGrams: 3 }],
      }),
    ).toMatchObject({ ok: false, code: "INVALID" });
    expect(readCreatePalletSet({ ...header, netWeightGrams: 1 })).toMatchObject({
      ok: false,
      code: "INVALID",
    });
  });

  it("accepts an empty pallet list and rejects more than 500", () => {
    const created = readCreatePalletSet(header);
    expect(created.ok).toBe(true);
    if (created.ok) {
      expect(created.data.pallets).toEqual([]);
    }

    const tooMany = readCreatePalletSet({
      ...header,
      pallets: Array.from({ length: 501 }, () => pallet),
    });
    expect(tooMany).toMatchObject({ ok: false, code: "SET_TOO_LARGE" });
  });

  it("rejects a calendar date that does not exist", () => {
    expect(readCreatePalletSet({ ...header, receivedOn: "2026-02-31" })).toMatchObject({
      ok: false,
      code: "INVALID",
    });
  });

  it("keeps list limits inside the page window", () => {
    expect(readListPalletSets({ limit: 100, offset: 0 }).ok).toBe(true);
    expect(readListPalletSets({ limit: 101 })).toMatchObject({ ok: false, code: "INVALID" });
    expect(
      readAddPallets({
        setId: header.growerId,
        revision: 1,
        pallets: [pallet],
        netWeightGrams: 5,
      }),
    ).toMatchObject({ ok: false, code: "INVALID" });
  });
});
