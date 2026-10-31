import type { ReferenceTable } from "@/lib/access-types";

export const referenceTableMeta = {
  growers: {
    label: "מגדלים",
    href: "/app/growers",
    hasTare: false,
    hasInventory: false,
  },
  yield_types: {
    label: "סוגי יבול",
    href: "/app/yield-types",
    hasTare: false,
    hasInventory: false,
  },
  package_types: {
    label: "סוגי אריזה",
    href: "/app/package-types",
    hasTare: true,
    hasInventory: true,
  },
  pallet_types: {
    label: "סוגי משטח",
    href: "/app/pallet-types",
    hasTare: true,
    hasInventory: false,
  },
} as const satisfies Record<
  ReferenceTable,
  { label: string; href: string; hasTare: boolean; hasInventory: boolean }
>;

export const referenceTableOrder = [
  "growers",
  "yield_types",
  "package_types",
  "pallet_types",
] as const satisfies readonly ReferenceTable[];
