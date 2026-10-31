import { RECOMMENDED_PACKAGE_AMOUNT_MAX } from "@/lib/reference-limits";

const RECOMMENDED_AMOUNT_PATTERN = /^[1-9]\d*$/;

/** Parses a package count. Empty is handled by the caller. */
export function parseRecommendedPackageAmount(input: string): number | null {
  const trimmed = input.trim();
  if (!RECOMMENDED_AMOUNT_PATTERN.test(trimmed)) {
    return null;
  }

  const amount = Number(trimmed);
  if (
    !Number.isSafeInteger(amount) ||
    amount < 1 ||
    amount > RECOMMENDED_PACKAGE_AMOUNT_MAX
  ) {
    return null;
  }

  return amount;
}
