import { PALLET_KINDS, type PalletKind } from "@/lib/access-types";

/**
 * The only map from a pallet-set kind to how its packages move.
 * `in` is grower to packing house. `none` does not move a balance.
 * A later certificate can add a kind whose flow is `out`.
 */
export const PACKAGE_FLOW = {
  A: "in",
  B: "in",
  C: "none",
} as const satisfies Record<PalletKind, "in" | "none">;

export type PackageFlow = (typeof PACKAGE_FLOW)[keyof typeof PACKAGE_FLOW];

/** Hebrew labels for the kind codes. The letters stay LTR in the UI. */
export const PALLET_KIND_LABELS = {
  A: "א",
  B: "ב",
  C: "ג",
} as const satisfies Record<PalletKind, string>;

export function kindsForPackageFlow(flow: PackageFlow): PalletKind[] {
  return PALLET_KINDS.filter((kind) => PACKAGE_FLOW[kind] === flow);
}
