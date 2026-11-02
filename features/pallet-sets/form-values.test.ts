import { describe, expect, it } from "vitest";

import { readAddPalletForm, readCreateSetForm } from "./form-values";

const SET_ID = "6ba7b810-9dad-41d1-80b4-00c04fd430c8";
const GROWER_ID = "6ba7b811-9dad-41d1-80b4-00c04fd430c8";
const TYPE_ID = "6ba7b812-9dad-41d1-80b4-00c04fd430c8";

describe("pallet set form values", () => {
  it("saves a header with no pallets", () => {
    const formData = new FormData();
    formData.set("kind", "C");
    formData.set("referenceNumber", "15");
    formData.set("growerId", GROWER_ID);
    formData.set("receivedOn", "2026-11-02");

    const read = readCreateSetForm(formData);
    expect(read.ok).toBe(true);
    if (read.ok) {
      expect(read.value.pallets).toEqual([]);
      expect(read.value.referenceNumber).toBe(15);
    }
  });

  it("converts one pallet, including a gross weight above the tare cap", () => {
    const formData = new FormData();
    formData.set("setId", SET_ID);
    formData.set("revision", "3");
    formData.set("palletNumber", "8");
    formData.set("yieldTypeId", TYPE_ID);
    formData.set("packageTypeId", TYPE_ID);
    formData.set("palletTypeId", TYPE_ID);
    formData.set("packageAmount", "40");
    formData.set("grossWeightKilograms", "500.5");

    const read = readAddPalletForm(formData);
    expect(read.ok).toBe(true);
    if (read.ok) {
      expect(read.value.pallets[0]?.grossWeightGrams).toBe(500_500);
      expect(read.value.revision).toBe(3);
    }
  });

  it("keeps a bad kilogram off the service input", () => {
    const formData = new FormData();
    formData.set("setId", SET_ID);
    formData.set("revision", "3");
    formData.set("palletNumber", "8");
    formData.set("yieldTypeId", TYPE_ID);
    formData.set("packageTypeId", TYPE_ID);
    formData.set("palletTypeId", TYPE_ID);
    formData.set("packageAmount", "40");
    formData.set("grossWeightKilograms", "100001");

    const read = readAddPalletForm(formData);
    expect(read.ok).toBe(false);
    if (!read.ok) {
      expect(read.field).toBe("grossWeightKilograms");
    }
  });
});
