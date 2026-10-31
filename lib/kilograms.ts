import { TARE_MAX_GRAMS } from "@/lib/reference-limits";

const KILOGRAM_PATTERN = /^(\d{1,6})(?:\.(\d{1,3}))?$/;

/**
 * Parses a kilogram string into integer grams.
 * The whole kilograms and the thousandths are converted separately, so a
 * value such as "1.005" cannot be rounded by a binary float.
 */
export function parseKilogramsToGrams(input: string): number | null {
  const match = KILOGRAM_PATTERN.exec(input.trim());
  if (!match) {
    return null;
  }

  const whole = match[1];
  const fraction = match[2] ?? "";
  if (whole === undefined) {
    return null;
  }

  const wholeGrams = integerDigits(whole) * 1000;
  const fractionGrams = integerDigits(fraction.padEnd(3, "0"));
  const grams = wholeGrams + fractionGrams;
  if (!Number.isSafeInteger(grams) || grams > TARE_MAX_GRAMS) {
    return null;
  }

  return grams;
}

export function formatGramsAsKilograms(grams: number): string {
  if (!Number.isSafeInteger(grams)) {
    throw new Error("Grams must be an integer");
  }

  const negative = grams < 0;
  const absolute = negative ? -grams : grams;
  const whole = Math.trunc(absolute / 1000);
  const fraction = absolute % 1000;
  const body =
    fraction === 0
      ? String(whole)
      : `${String(whole)}.${String(fraction).padStart(3, "0").replace(/0+$/, "")}`;

  return negative ? `-${body}` : body;
}

function integerDigits(digits: string): number {
  if (digits.length === 0) {
    return 0;
  }

  return Number(digits);
}
