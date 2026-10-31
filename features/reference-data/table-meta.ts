import type { ReferenceTable } from "@/lib/access-types";

export const referenceTableMeta = {
  growers: {
    label: "מגדלים",
    href: "/app/growers",
    hasTare: false,
    tareRequired: false,
    hasInventory: false,
    hasPackageMeasures: false,
  },
  yield_types: {
    label: "סוגי יבול",
    href: "/app/yield-types",
    hasTare: false,
    tareRequired: false,
    hasInventory: false,
    hasPackageMeasures: false,
  },
  package_types: {
    label: "סוגי אריזה",
    href: "/app/package-types",
    hasTare: true,
    tareRequired: false,
    hasInventory: true,
    hasPackageMeasures: true,
  },
  pallet_types: {
    label: "סוגי משטח",
    href: "/app/pallet-types",
    hasTare: true,
    tareRequired: true,
    hasInventory: false,
    hasPackageMeasures: false,
  },
} as const satisfies Record<
  ReferenceTable,
  {
    label: string;
    href: string;
    hasTare: boolean;
    tareRequired: boolean;
    hasInventory: boolean;
    hasPackageMeasures: boolean;
  }
>;

export const referenceTableOrder = [
  "growers",
  "yield_types",
  "package_types",
  "pallet_types",
] as const satisfies readonly ReferenceTable[];
