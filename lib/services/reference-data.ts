import "server-only";

import { asc, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { growers, packageTypes, palletTypes, yieldTypes } from "@/db/schema";
import { canReadReference, canWriteReference, type Actor } from "@/lib/access";
import type { ReferenceTable } from "@/lib/access-types";
import {
  isCheckViolation,
  isUniqueViolation,
  logPostgresFailure,
} from "@/lib/postgres-error";

import {
  forbidden,
  invalidRequest,
  nameTaken,
  notFound,
  type CreateReferenceInput,
  type DeactivateReferenceInput,
  type ReferenceRecord,
  type ReferenceResult,
  type UpdateReferenceInput,
} from "./reference-input";

export async function listActiveReference(
  actor: Actor,
  table: ReferenceTable,
): Promise<ReferenceResult<ReferenceRecord[]>> {
  if (!canReadReference(actor, table)) {
    return forbidden();
  }
  return { ok: true, data: await selectReference(table, true) };
}

export async function listReferenceAdmin(
  actor: Actor,
  table: ReferenceTable,
): Promise<ReferenceResult<ReferenceRecord[]>> {
  if (!canWriteReference(actor, table)) {
    return forbidden();
  }
  return { ok: true, data: await selectReference(table, false) };
}

export async function createReference(
  actor: Actor,
  input: CreateReferenceInput,
): Promise<ReferenceResult<ReferenceRecord>> {
  if (!canWriteReference(actor, input.table)) {
    return forbidden();
  }
  return captureWrite(() => insertReference(input));
}

export async function updateReference(
  actor: Actor,
  input: UpdateReferenceInput,
): Promise<ReferenceResult<ReferenceRecord>> {
  if (!canWriteReference(actor, input.table)) {
    return forbidden();
  }
  return captureWrite(() => updateReferenceRow(input));
}

export async function deactivateReference(
  actor: Actor,
  input: DeactivateReferenceInput,
): Promise<ReferenceResult<{ id: string }>> {
  if (!canWriteReference(actor, input.table)) {
    return forbidden();
  }
  return captureWrite(() => deactivateReferenceRow(input));
}

async function selectReference(
  table: ReferenceTable,
  activeOnly: boolean,
): Promise<ReferenceRecord[]> {
  switch (table) {
    case "growers":
      return mapNamed(
        await db
          .select({
            id: growers.id,
            name: growers.name,
            isActive: growers.isActive,
          })
          .from(growers)
          .where(activeOnly ? eq(growers.isActive, true) : undefined)
          .orderBy(
            ...(activeOnly
              ? [asc(growers.name)]
              : [desc(growers.isActive), asc(growers.name)]),
          ),
      );
    case "yield_types":
      return mapNamed(
        await db
          .select({
            id: yieldTypes.id,
            name: yieldTypes.name,
            isActive: yieldTypes.isActive,
          })
          .from(yieldTypes)
          .where(activeOnly ? eq(yieldTypes.isActive, true) : undefined)
          .orderBy(
            ...(activeOnly
              ? [asc(yieldTypes.name)]
              : [desc(yieldTypes.isActive), asc(yieldTypes.name)]),
          ),
      );
    case "package_types":
      return db
        .select({
          id: packageTypes.id,
          name: packageTypes.name,
          isActive: packageTypes.isActive,
          tareGrams: packageTypes.tareGrams,
          countsInGrowerInventory: packageTypes.countsInGrowerInventory,
        })
        .from(packageTypes)
        .where(activeOnly ? eq(packageTypes.isActive, true) : undefined)
        .orderBy(
          ...(activeOnly
            ? [asc(packageTypes.name)]
            : [desc(packageTypes.isActive), asc(packageTypes.name)]),
        );
    case "pallet_types":
      return (
        await db
          .select({
            id: palletTypes.id,
            name: palletTypes.name,
            isActive: palletTypes.isActive,
            tareGrams: palletTypes.tareGrams,
          })
          .from(palletTypes)
          .where(activeOnly ? eq(palletTypes.isActive, true) : undefined)
          .orderBy(
            ...(activeOnly
              ? [asc(palletTypes.name)]
              : [desc(palletTypes.isActive), asc(palletTypes.name)]),
          )
      ).map((row) => ({ ...row, countsInGrowerInventory: null }));
  }
}

function mapNamed(
  rows: { id: string; name: string; isActive: boolean }[],
): ReferenceRecord[] {
  return rows.map((row) => ({
    ...row,
    tareGrams: null,
    countsInGrowerInventory: null,
  }));
}

async function insertReference(
  input: CreateReferenceInput,
): Promise<ReferenceResult<ReferenceRecord>> {
  switch (input.table) {
    case "growers":
      return inserted(
        await db
          .insert(growers)
          .values({ name: input.name, isActive: true })
          .returning({
            id: growers.id,
            name: growers.name,
            isActive: growers.isActive,
          }),
      );
    case "yield_types":
      return inserted(
        await db
          .insert(yieldTypes)
          .values({ name: input.name, isActive: true })
          .returning({
            id: yieldTypes.id,
            name: yieldTypes.name,
            isActive: yieldTypes.isActive,
          }),
      );
    case "pallet_types":
      return insertedPallet(
        await db
          .insert(palletTypes)
          .values({ name: input.name, tareGrams: input.tareGrams, isActive: true })
          .returning({
            id: palletTypes.id,
            name: palletTypes.name,
            isActive: palletTypes.isActive,
            tareGrams: palletTypes.tareGrams,
          }),
      );
    case "package_types":
      return insertedPackage(
        await db
          .insert(packageTypes)
          .values({
            name: input.name,
            tareGrams: input.tareGrams,
            countsInGrowerInventory: input.countsInGrowerInventory,
            isActive: true,
          })
          .returning({
            id: packageTypes.id,
            name: packageTypes.name,
            isActive: packageTypes.isActive,
            tareGrams: packageTypes.tareGrams,
            countsInGrowerInventory: packageTypes.countsInGrowerInventory,
          }),
      );
  }
}

function inserted(
  rows: { id: string; name: string; isActive: boolean }[],
): ReferenceResult<ReferenceRecord> {
  const row = rows[0];
  if (!row) {
    throw new Error("reference-data insert returned no row");
  }
  return {
    ok: true,
    data: { ...row, tareGrams: null, countsInGrowerInventory: null },
  };
}

function insertedPallet(
  rows: { id: string; name: string; isActive: boolean; tareGrams: number }[],
): ReferenceResult<ReferenceRecord> {
  const row = rows[0];
  if (!row) {
    throw new Error("reference-data insert returned no row");
  }
  return { ok: true, data: { ...row, countsInGrowerInventory: null } };
}

function insertedPackage(
  rows: {
    id: string;
    name: string;
    isActive: boolean;
    tareGrams: number;
    countsInGrowerInventory: boolean;
  }[],
): ReferenceResult<ReferenceRecord> {
  const row = rows[0];
  if (!row) {
    throw new Error("reference-data insert returned no row");
  }
  return { ok: true, data: row };
}

async function updateReferenceRow(
  input: UpdateReferenceInput,
): Promise<ReferenceResult<ReferenceRecord>> {
  const updatedAt = new Date();

  switch (input.table) {
    case "growers": {
      const rows = await db
        .update(growers)
        .set({ name: input.name, updatedAt })
        .where(eq(growers.id, input.id))
        .returning({
          id: growers.id,
          name: growers.name,
          isActive: growers.isActive,
        });
      return updatedNamed(rows);
    }
    case "yield_types": {
      const rows = await db
        .update(yieldTypes)
        .set({ name: input.name, updatedAt })
        .where(eq(yieldTypes.id, input.id))
        .returning({
          id: yieldTypes.id,
          name: yieldTypes.name,
          isActive: yieldTypes.isActive,
        });
      return updatedNamed(rows);
    }
    case "pallet_types": {
      const rows = await db
        .update(palletTypes)
        .set({
          updatedAt,
          ...(input.name === undefined ? {} : { name: input.name }),
          ...(input.tareGrams === undefined ? {} : { tareGrams: input.tareGrams }),
        })
        .where(eq(palletTypes.id, input.id))
        .returning({
          id: palletTypes.id,
          name: palletTypes.name,
          isActive: palletTypes.isActive,
          tareGrams: palletTypes.tareGrams,
        });
      const row = rows[0];
      if (!row) {
        return notFound();
      }
      return { ok: true, data: { ...row, countsInGrowerInventory: null } };
    }
    case "package_types": {
      const rows = await db
        .update(packageTypes)
        .set({
          updatedAt,
          ...(input.name === undefined ? {} : { name: input.name }),
          ...(input.tareGrams === undefined ? {} : { tareGrams: input.tareGrams }),
          ...(input.countsInGrowerInventory === undefined
            ? {}
            : { countsInGrowerInventory: input.countsInGrowerInventory }),
        })
        .where(eq(packageTypes.id, input.id))
        .returning({
          id: packageTypes.id,
          name: packageTypes.name,
          isActive: packageTypes.isActive,
          tareGrams: packageTypes.tareGrams,
          countsInGrowerInventory: packageTypes.countsInGrowerInventory,
        });
      const row = rows[0];
      if (!row) {
        return notFound();
      }
      return { ok: true, data: row };
    }
  }
}

function updatedNamed(
  rows: { id: string; name: string; isActive: boolean }[],
): ReferenceResult<ReferenceRecord> {
  const row = rows[0];
  if (!row) {
    return notFound();
  }
  return {
    ok: true,
    data: { ...row, tareGrams: null, countsInGrowerInventory: null },
  };
}

async function deactivateReferenceRow(
  input: DeactivateReferenceInput,
): Promise<ReferenceResult<{ id: string }>> {
  const updatedAt = new Date();

  switch (input.table) {
    case "growers":
      return deactivated(
        await db
          .update(growers)
          .set({ isActive: false, updatedAt })
          .where(eq(growers.id, input.id))
          .returning({ id: growers.id }),
      );
    case "yield_types":
      return deactivated(
        await db
          .update(yieldTypes)
          .set({ isActive: false, updatedAt })
          .where(eq(yieldTypes.id, input.id))
          .returning({ id: yieldTypes.id }),
      );
    case "package_types":
      return deactivated(
        await db
          .update(packageTypes)
          .set({ isActive: false, updatedAt })
          .where(eq(packageTypes.id, input.id))
          .returning({ id: packageTypes.id }),
      );
    case "pallet_types":
      return deactivated(
        await db
          .update(palletTypes)
          .set({ isActive: false, updatedAt })
          .where(eq(palletTypes.id, input.id))
          .returning({ id: palletTypes.id }),
      );
  }
}

function deactivated(rows: { id: string }[]): ReferenceResult<{ id: string }> {
  const row = rows[0];
  if (!row) {
    return notFound();
  }
  return { ok: true, data: row };
}

async function captureWrite<T>(
  operation: () => Promise<ReferenceResult<T>>,
): Promise<ReferenceResult<T>> {
  try {
    return await operation();
  } catch (error: unknown) {
    if (isUniqueViolation(error)) {
      return nameTaken();
    }
    if (isCheckViolation(error)) {
      return invalidRequest();
    }
    logPostgresFailure("reference-data write failed", error);
    throw new Error("reference-data write failed");
  }
}
