import { describe, expect, it } from "vitest";

import { setTooLarge } from "@/lib/services/pallet-set-input";

import { readAddPalletForm, readCreateSetForm, readEditEntryForm } from "./form-values";
import { buildPalletChange } from "./grid-diff";
import { GRID_ROW_COUNT, gridFieldName } from "./grid-rows";

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

  it("reads about 40 rows as one pallet list and ignores net and tare fields", () => {
    const formData = headerForm();
    formData.set(GRID_ROW_COUNT, "40");
    for (let index = 0; index < 40; index += 1) {
      fillRow(formData, index, index + 1);
      formData.set(gridFieldName(index, "id"), "");
      formData.set(`row.${index}.netWeightGrams`, "1");
      formData.set(`row.${index}.packageTareGrams`, "2");
    }

    const read = readCreateSetForm(formData);
    expect(read.ok).toBe(true);
    if (read.ok) {
      expect(read.value.pallets).toHaveLength(40);
      expect(read.value.pallets[0]).toEqual({
        palletNumber: 1,
        yieldTypeId: TYPE_ID,
        packageTypeId: TYPE_ID,
        palletTypeId: TYPE_ID,
        packageAmount: 10,
        grossWeightGrams: 20_000,
      });
      expect(read.value.pallets[0]).not.toHaveProperty("id");
      expect(read.value.pallets[0]).not.toHaveProperty("netWeightGrams");
      expect(read.value.pallets[39]?.palletNumber).toBe(40);
    }
  });

  it("rejects more than 500 rows before they reach the service", () => {
    const formData = headerForm();
    formData.set(GRID_ROW_COUNT, "501");
    const read = readCreateSetForm(formData);
    expect(read.ok).toBe(false);
    if (!read.ok) {
      expect(read.message).toBe(setTooLarge().message);
    }
  });

  it("keeps pallet ids on an edit and skips a blank row", () => {
    const formData = headerForm();
    formData.set("id", SET_ID);
    formData.set("revision", "4");
    formData.set(GRID_ROW_COUNT, "2");
    fillRow(formData, 0, 3);
    formData.set(gridFieldName(0, "id"), TYPE_ID);
    fillRow(formData, 1, 1);
    for (const field of ["id", "palletNumber", "yieldTypeId", "packageTypeId", "palletTypeId", "packageAmount", "grossWeightKilograms"] as const) {
      formData.set(gridFieldName(1, field), "");
    }

    const read = readEditEntryForm(formData);
    expect(read.ok).toBe(true);
    if (!read.ok) {
      return;
    }
    expect(read.value.rows).toHaveLength(1);
    expect(read.value.rows[0]?.id).toBe(TYPE_ID);
    const change = buildPalletChange(SET_ID, read.value.revision, [], read.value.rows);
    expect(change?.add).toEqual([]);
    expect(change?.update).toHaveLength(1);
    expect(change?.update[0]?.id).toBe(TYPE_ID);
  });
});

function headerForm(): FormData {
  const formData = new FormData();
  formData.set("kind", "A");
  formData.set("referenceNumber", "15");
  formData.set("growerId", GROWER_ID);
  formData.set("receivedOn", "2026-11-02");
  return formData;
}

function fillRow(formData: FormData, index: number, palletNumber: number): void {
  formData.set(gridFieldName(index, "palletNumber"), String(palletNumber));
  formData.set(gridFieldName(index, "yieldTypeId"), TYPE_ID);
  formData.set(gridFieldName(index, "packageTypeId"), TYPE_ID);
  formData.set(gridFieldName(index, "palletTypeId"), TYPE_ID);
  formData.set(gridFieldName(index, "packageAmount"), "10");
  formData.set(gridFieldName(index, "grossWeightKilograms"), "20");
}
