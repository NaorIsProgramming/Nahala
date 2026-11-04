import "server-only";

import type { Actor } from "@/lib/access-types";
import { listActiveReference } from "@/lib/services/reference-data";
import { listCommonNameIds, listSetGrowers } from "@/lib/services/pallet-sets";

import type { PackageChoice, PalletTypeChoice } from "./grid-rows";

export type EntryCatalog = {
  growers: { id: string; name: string }[];
  yieldTypes: { id: string; name: string }[];
  packageTypes: PackageChoice[];
  palletTypes: PalletTypeChoice[];
  commonGrowerIds: string[];
  commonYieldIds: string[];
  commonPackageIds: string[];
  commonPalletTypeIds: string[];
};

type StoredType = {
  yieldTypeId: string;
  yieldTypeName: string;
  packageTypeId: string;
  packageTypeName: string;
  packageTareGrams: number;
  palletTypeId: string;
  palletTypeName: string;
  palletTareGrams: number;
};

export type EntryCatalogResult =
  | { status: "ready"; catalog: EntryCatalog }
  | { status: "no-growers" }
  | { status: "unavailable"; message: string };

export async function loadEntryCatalog(actor: Actor): Promise<EntryCatalogResult> {
  const [growers, yields, packages, palletTypes, commonNames] = await Promise.all([
    listSetGrowers(actor),
    listActiveReference(actor, "yield_types"),
    listActiveReference(actor, "package_types"),
    listActiveReference(actor, "pallet_types"),
    listCommonNameIds(actor),
  ]);
  if (!growers.ok) {
    return { status: "unavailable", message: growers.message };
  }
  if (growers.data.length === 0) {
    return { status: "no-growers" };
  }

  const palletChoices: PalletTypeChoice[] = [];
  if (palletTypes.ok) {
    for (const row of palletTypes.data) {
      if (row.tareGrams === null) {
        continue;
      }
      palletChoices.push({ id: row.id, name: row.name, tareGrams: row.tareGrams });
    }
  }

  return {
    status: "ready",
    catalog: {
      growers: growers.data,
      yieldTypes: yields.ok ? yields.data.map((row) => ({ id: row.id, name: row.name })) : [],
      packageTypes: packages.ok
        ? packages.data.map((row) => ({
            id: row.id,
            name: row.name,
            tareGrams: row.tareGrams,
            recommendedPackageAmount: row.recommendedPackageAmount,
          }))
        : [],
      palletTypes: palletChoices,
      commonGrowerIds: commonNames.growers,
      commonYieldIds: commonNames.yieldTypes,
      commonPackageIds: commonNames.packageTypes,
      commonPalletTypeIds: commonNames.palletTypes,
    },
  };
}

/**
 * Keeps a pallet's current type selectable when it is no longer in the active list.
 * Active rows keep the catalog tare, which is what the next save will store.
 */
export function withPalletTypes(catalog: EntryCatalog, pallets: StoredType[]): EntryCatalog {
  return {
    ...catalog,
    yieldTypes: mergeById(
      catalog.yieldTypes,
      pallets.map((pallet) => ({ id: pallet.yieldTypeId, name: pallet.yieldTypeName })),
    ),
    packageTypes: mergeById(
      catalog.packageTypes,
      pallets.map((pallet) => ({
        id: pallet.packageTypeId,
        name: pallet.packageTypeName,
        tareGrams: pallet.packageTareGrams,
        recommendedPackageAmount: null,
      })),
    ),
    palletTypes: mergeById(
      catalog.palletTypes,
      pallets.map((pallet) => ({
        id: pallet.palletTypeId,
        name: pallet.palletTypeName,
        tareGrams: pallet.palletTareGrams,
      })),
    ),
  };
}

function mergeById<T extends { id: string }>(current: T[], extra: T[]): T[] {
  const seen = new Set(current.map((item) => item.id));
  const merged = [...current];
  for (const item of extra) {
    if (seen.has(item.id)) {
      continue;
    }
    seen.add(item.id);
    merged.push(item);
  }
  return merged;
}
