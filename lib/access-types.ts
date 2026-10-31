export const REFERENCE_TABLES = [
  "growers",
  "yield_types",
  "package_types",
  "pallet_types",
] as const;

export type ReferenceTable = (typeof REFERENCE_TABLES)[number];

export const GRANT_SCOPES = ["global", "palletSets", "reference"] as const;

export type GrantScope = (typeof GRANT_SCOPES)[number];

export const GRANT_ACCESS_LEVELS = ["read", "write"] as const;

export type GrantAccess = (typeof GRANT_ACCESS_LEVELS)[number];

export const PALLET_KINDS = ["A", "B", "C"] as const;

export type PalletKind = (typeof PALLET_KINDS)[number];

export type Grant =
  | { scope: "global"; access: GrantAccess }
  | {
      scope: "palletSets";
      access: GrantAccess;
      growerId: string | null;
      kind: PalletKind | null;
    }
  | { scope: "reference"; table: ReferenceTable; access: "write" };

export type Actor = {
  userId: string;
  grants: Grant[];
};

export function isReferenceTable(value: string): value is ReferenceTable {
  return REFERENCE_TABLES.some((table) => table === value);
}

export function isPalletKind(value: string): value is PalletKind {
  return PALLET_KINDS.some((kind) => kind === value);
}
