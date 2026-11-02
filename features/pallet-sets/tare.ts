/** Tare already subtracted by the net-weight formula. */
export function totalTareGrams(
  packageTareGrams: number,
  packageAmount: number,
  palletTareGrams: number,
): number {
  return packageTareGrams * packageAmount + palletTareGrams;
}
