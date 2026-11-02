import "server-only";

import { and, eq, sql } from "drizzle-orm";

import { pallets } from "@/db/schema";

import type { DbTransaction } from "./db-transaction";

/**
 * One UPDATE for voided pallets of this package type. Active rows are not
 * in the statement. A missing tare is stored as 0. Net weight is clamped
 * with greatest(0, formula) so a voided row can keep a tare the active
 * check would reject.
 */
export async function applyVoidedPackageTare(
  tx: DbTransaction,
  packageTypeId: string,
  tareGrams: number | null,
): Promise<void> {
  const storedTare = tareGrams ?? 0;
  await tx
    .update(pallets)
    .set({
      packageTareGrams: storedTare,
      netWeightGrams: sql`greatest(0, ${pallets.grossWeightGrams} - ${storedTare} * ${pallets.packageAmount} - ${pallets.palletTareGrams})`,
      updatedAt: new Date(),
    })
    .where(and(eq(pallets.packageTypeId, packageTypeId), eq(pallets.voided, true)));
}

/** One UPDATE for voided pallets of this pallet type. Pallet tare is required. */
export async function applyVoidedPalletTare(
  tx: DbTransaction,
  palletTypeId: string,
  tareGrams: number,
): Promise<void> {
  await tx
    .update(pallets)
    .set({
      palletTareGrams: tareGrams,
      netWeightGrams: sql`greatest(0, ${pallets.grossWeightGrams} - ${pallets.packageTareGrams} * ${pallets.packageAmount} - ${tareGrams})`,
      updatedAt: new Date(),
    })
    .where(and(eq(pallets.palletTypeId, palletTypeId), eq(pallets.voided, true)));
}
