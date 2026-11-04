import { formatGramsAsKilograms, parseKilogramsToGrams } from "@/lib/kilograms";
import { netWeightGrams } from "@/lib/pallet-sets/net-weight";
import { parseRecommendedPackageAmount } from "@/lib/recommended-package-amount";
import { PALLET_GROSS_WEIGHT_MAX_GRAMS } from "@/lib/reference-limits";

/** Same Hebrew sentence as the service result `NET_WEIGHT_NEGATIVE`. */
export const NEGATIVE_NET_MESSAGE = "המשקל הנטו יצא שלילי";

export const GRID_ROW_COUNT = "rowCount";

export type GridInputField =
  | "id"
  | "palletNumber"
  | "yieldTypeId"
  | "packageTypeId"
  | "palletTypeId"
  | "packageAmount"
  | "grossWeightKilograms";

export type GridRow = {
  key: string;
  id: string | null;
  palletNumber: string;
  yieldTypeId: string;
  packageTypeId: string;
  palletTypeId: string;
  packageAmount: string;
  grossWeightKilograms: string;
};

export type PackageChoice = {
  id: string;
  name: string;
  tareGrams: number | null;
  recommendedPackageAmount: number | null;
};

export type PalletTypeChoice = {
  id: string;
  name: string;
  tareGrams: number;
};

export function gridFieldName(index: number, field: GridInputField): string {
  return `row.${index}.${field}`;
}

export function emptyGridRow(key: string): GridRow {
  return {
    key,
    id: null,
    palletNumber: "",
    yieldTypeId: "",
    packageTypeId: "",
    palletTypeId: "",
    packageAmount: "",
    grossWeightKilograms: "",
  };
}

/** A new row keeps the previous types and package amount. Number and gross stay empty. */
export function rowCopiedFrom(previous: GridRow, key: string): GridRow {
  return {
    key,
    id: null,
    palletNumber: "",
    yieldTypeId: previous.yieldTypeId,
    packageTypeId: previous.packageTypeId,
    palletTypeId: previous.palletTypeId,
    packageAmount: previous.packageAmount,
    grossWeightKilograms: "",
  };
}

/**
 * A recommendation replaces the amount. No recommendation leaves the current amount,
 * including an amount the operator already changed.
 */
export function packageAmountForType(
  currentAmount: string,
  recommendedPackageAmount: number | null,
): string {
  if (recommendedPackageAmount === null) {
    return currentAmount;
  }
  return String(recommendedPackageAmount);
}

export function gridRowFromSaved(pallet: {
  id: string;
  palletNumber: number;
  yieldTypeId: string;
  packageTypeId: string;
  palletTypeId: string;
  packageAmount: number;
  grossWeightGrams: number;
}): GridRow {
  return {
    key: pallet.id,
    id: pallet.id,
    palletNumber: String(pallet.palletNumber),
    yieldTypeId: pallet.yieldTypeId,
    packageTypeId: pallet.packageTypeId,
    palletTypeId: pallet.palletTypeId,
    packageAmount: String(pallet.packageAmount),
    grossWeightKilograms: formatGramsAsKilograms(pallet.grossWeightGrams),
  };
}

/** Restores rows the name-search draft stored. Returns null when this form did not save a grid. */
export function gridRowsFromRecord(values: Record<string, string>): GridRow[] | null {
  if (!(GRID_ROW_COUNT in values)) {
    return null;
  }
  const count = Number(values[GRID_ROW_COUNT]);
  if (!Number.isInteger(count) || count < 0 || count > 500) {
    return null;
  }
  const rows: GridRow[] = [];
  for (let index = 0; index < count; index += 1) {
    const id = values[gridFieldName(index, "id")] ?? "";
    rows.push({
      key: id.length > 0 ? id : `draft-${index}`,
      id: id.length > 0 ? id : null,
      palletNumber: values[gridFieldName(index, "palletNumber")] ?? "",
      yieldTypeId: values[gridFieldName(index, "yieldTypeId")] ?? "",
      packageTypeId: values[gridFieldName(index, "packageTypeId")] ?? "",
      palletTypeId: values[gridFieldName(index, "palletTypeId")] ?? "",
      packageAmount: values[gridFieldName(index, "packageAmount")] ?? "",
      grossWeightKilograms: values[gridFieldName(index, "grossWeightKilograms")] ?? "",
    });
  }
  return rows;
}

/**
 * Live preview in grams, using the tares loaded with the form.
 * A missing package tare counts as 0. The result is not clamped.
 * Returns null until the row has a gross weight, an amount, and both types.
 */
export function previewNetGrams(
  row: Pick<GridRow, "packageTypeId" | "palletTypeId" | "packageAmount" | "grossWeightKilograms">,
  packages: PackageChoice[],
  palletTypes: PalletTypeChoice[],
): number | null {
  const gross = parseKilogramsToGrams(row.grossWeightKilograms, PALLET_GROSS_WEIGHT_MAX_GRAMS);
  const amount = parseRecommendedPackageAmount(row.packageAmount);
  if (gross === null || amount === null) {
    return null;
  }
  const packageType = packages.find((item) => item.id === row.packageTypeId);
  const palletType = palletTypes.find((item) => item.id === row.palletTypeId);
  if (packageType === undefined || palletType === undefined) {
    return null;
  }
  return netWeightGrams(gross, packageType.tareGrams ?? 0, amount, palletType.tareGrams);
}
