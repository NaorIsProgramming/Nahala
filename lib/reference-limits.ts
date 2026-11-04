/** Shared by the database checks and the kilogram parser. */
export const REFERENCE_NAME_MAX_LENGTH = 200;

/** 100 kilograms, stored as grams. */
export const TARE_MAX_GRAMS = 100_000;

/** 100,000 kilograms, stored as grams. Cap for one pallet's gross weight. */
export const PALLET_GROSS_WEIGHT_MAX_GRAMS = 100_000_000;

/** Same cap as a pallet's package amount. */
export const RECOMMENDED_PACKAGE_AMOUNT_MAX = 10_000;
