import { z } from "zod";

import { parseKilogramsToGrams } from "@/lib/kilograms";
import { parseRecommendedPackageAmount } from "@/lib/recommended-package-amount";
import {
  MAX_PALLETS_PER_REQUEST,
  PALLET_GROSS_WEIGHT_MAX_GRAMS,
  setTooLarge,
} from "@/lib/services/pallet-set-input";

import type { PalletSetActionField } from "./action-state";
import type { SubmittedPallet } from "./grid-diff";
import { GRID_ROW_COUNT, gridFieldName } from "./grid-rows";

const INVALID_MESSAGE = "הבקשה אינה תקינה";
const POSTGRES_INT_MAX = 2_147_483_647;

export type GridReadFailure = {
  ok: false;
  message: string;
  field?: PalletSetActionField;
  rowIndex?: number;
};

export function readGridRows(
  formData: FormData,
): { ok: true; rows: SubmittedPallet[] } | GridReadFailure {
  if (!formData.has(GRID_ROW_COUNT)) {
    return { ok: true, rows: [] };
  }
  const count = readWholeNumber(readText(formData, GRID_ROW_COUNT));
  if (count === null || count < 0) {
    return { ok: false, message: INVALID_MESSAGE };
  }
  if (count > MAX_PALLETS_PER_REQUEST) {
    return { ok: false, message: setTooLarge().message };
  }

  const rows: SubmittedPallet[] = [];
  for (let index = 0; index < count; index += 1) {
    const id = readText(formData, gridFieldName(index, "id"));
    const palletNumberText = readText(formData, gridFieldName(index, "palletNumber"));
    const yieldTypeId = readText(formData, gridFieldName(index, "yieldTypeId"));
    const packageTypeId = readText(formData, gridFieldName(index, "packageTypeId"));
    const palletTypeId = readText(formData, gridFieldName(index, "palletTypeId"));
    const packageAmountText = readText(formData, gridFieldName(index, "packageAmount"));
    const grossText = readText(formData, gridFieldName(index, "grossWeightKilograms"));
    if (
      id.length === 0 &&
      palletNumberText.length === 0 &&
      yieldTypeId.length === 0 &&
      packageTypeId.length === 0 &&
      palletTypeId.length === 0 &&
      packageAmountText.length === 0 &&
      grossText.length === 0
    ) {
      continue;
    }
    if (id.length > 0 && !z.uuid().safeParse(id).success) {
      return { ok: false, message: INVALID_MESSAGE, rowIndex: index };
    }

    const palletNumber = readWholeNumber(palletNumberText);
    if (palletNumber === null || palletNumber < 1 || palletNumber > POSTGRES_INT_MAX) {
      return {
        ok: false,
        message: "מספר המשטח אינו תקין",
        field: "palletNumber",
        rowIndex: index,
      };
    }
    const yieldId = readTypeId(yieldTypeId);
    if (yieldId === null) {
      return { ok: false, message: "יש לבחור סוג יבול", field: "yieldTypeId", rowIndex: index };
    }
    const packageId = readTypeId(packageTypeId);
    if (packageId === null) {
      return { ok: false, message: "יש לבחור סוג אריזה", field: "packageTypeId", rowIndex: index };
    }
    const palletType = readTypeId(palletTypeId);
    if (palletType === null) {
      return { ok: false, message: "יש לבחור סוג משטח", field: "palletTypeId", rowIndex: index };
    }
    const packageAmount = parseRecommendedPackageAmount(packageAmountText);
    if (packageAmount === null) {
      return {
        ok: false,
        message: "כמות האריזות אינה תקינה",
        field: "packageAmount",
        rowIndex: index,
      };
    }
    const grossWeightGrams = parseKilogramsToGrams(grossText, PALLET_GROSS_WEIGHT_MAX_GRAMS);
    if (grossWeightGrams === null) {
      return {
        ok: false,
        message: "משקל הברוטו אינו תקין",
        field: "grossWeightKilograms",
        rowIndex: index,
      };
    }

    rows.push({
      id: id.length > 0 ? id : null,
      palletNumber,
      yieldTypeId: yieldId,
      packageTypeId: packageId,
      palletTypeId: palletType,
      packageAmount,
      grossWeightGrams,
    });
  }
  return { ok: true, rows };
}

function readTypeId(value: string): string | null {
  if (value.length === 0 || !z.uuid().safeParse(value).success) {
    return null;
  }
  return value;
}

function readText(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function readWholeNumber(value: string): number | null {
  if (!/^\d+$/.test(value)) {
    return null;
  }
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}
