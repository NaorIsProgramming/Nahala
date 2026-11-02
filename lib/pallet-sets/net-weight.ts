/**
 * Active pallet net weight, in grams.
 * A missing package tare is passed as 0. The result may be negative;
 * an active save rejects that, and only the voided tare update clamps it.
 */
export function netWeightGrams(
  grossWeightGrams: number,
  packageTareGrams: number,
  packageAmount: number,
  palletTareGrams: number,
): number {
  assertInteger(grossWeightGrams);
  assertInteger(packageTareGrams);
  assertInteger(packageAmount);
  assertInteger(palletTareGrams);

  return grossWeightGrams - packageTareGrams * packageAmount - palletTareGrams;
}

function assertInteger(value: number): void {
  if (!Number.isInteger(value)) {
    throw new Error("Net weight inputs must be integers");
  }
}
