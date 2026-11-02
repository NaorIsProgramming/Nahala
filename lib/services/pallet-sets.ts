import "server-only";

import { and, asc, desc, eq, gte, inArray, lte, sql, type SQL } from "drizzle-orm";

import { db } from "@/db";
import {
  growers,
  packageTypes,
  palletSets,
  palletTypes,
  pallets,
  yieldTypes,
} from "@/db/schema";
import { canWriteSet, scopeForSets, type Actor } from "@/lib/access";
import { isPalletKind, type PalletKind } from "@/lib/access-types";
import { netWeightGrams } from "@/lib/pallet-sets/net-weight";
import {
  isCheckViolation,
  isForeignKeyViolation,
  isUniqueViolation,
  logPostgresFailure,
  postgresConstraintName,
} from "@/lib/postgres-error";

import type { DbTransaction } from "./db-transaction";
import {
  palletChanges,
  writeAudit,
  type PalletAuditSnapshot,
  type PalletFieldChanges,
  type PalletSetAuditSummary,
} from "./pallet-set-audit";
import {
  inactiveReference,
  invalidRequest,
  netWeightNegative,
  notFound,
  palletNumbersDuplicate,
  palletNumbersTaken,
  readOnly,
  referenceTaken,
  revisionConflict,
  setTooLarge,
  setVoided,
  type AddPalletsInput,
  type ChangedPallets,
  type ChangePalletsInput,
  type CreatedPalletSet,
  type CreatePalletSetInput,
  type ListPalletSetsInput,
  type PalletClientInput,
  type PalletDetail,
  type PalletSetDetail,
  type PalletSetPage,
  type PalletSetResult,
  type PalletSetSummary,
  type PalletUpdateInput,
  type RemovePalletsInput,
  type SavedPalletSet,
  type SetGrowerOption,
  type UpdatePalletsInput,
  type UpdatePalletSetInput,
  type VoidPalletSetInput,
} from "./pallet-set-input";

const MAX_PALLETS_PER_REQUEST = 500;
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;
const MAX_PAGE_OFFSET = 100_000;
const ACTIVE_REFERENCE_CONSTRAINT = "pallet_sets_active_reference_number_uidx";
const ACTIVE_PALLET_NUMBER_CONSTRAINT = "pallets_active_grower_pallet_number_uidx";
const NET_WEIGHT_CONSTRAINT = "pallets_net_weight_grams_check";

type LockedSet = {
  id: string;
  kind: PalletKind;
  referenceNumber: number;
  growerId: string;
  receivedOn: string;
  voided: boolean;
  revision: number;
};

type WriteContext = {
  referenceNumber?: number;
  growerId?: string;
  palletNumbers: number[];
  exceptSetId: string | null;
};

type Selector = Pick<typeof db, "select">;

export async function listPalletSets(
  actor: Actor,
  input: ListPalletSetsInput = {},
): Promise<PalletSetResult<PalletSetPage>> {
  return listSets(actor, false, input);
}

export async function listVoidedPalletSets(
  actor: Actor,
  input: ListPalletSetsInput = {},
): Promise<PalletSetResult<PalletSetPage>> {
  return listSets(actor, true, input);
}

export async function getPalletSet(
  actor: Actor,
  id: string,
): Promise<PalletSetResult<PalletSetDetail>> {
  const set = await selectSet(and(eq(palletSets.id, id), setScope(actor)));
  if (!set) {
    return notFound();
  }
  return { ok: true, data: { ...set, pallets: await selectPallets(set.id) } };
}

export async function getActivePalletSetByReferenceNumber(
  actor: Actor,
  referenceNumber: number,
): Promise<PalletSetResult<PalletSetDetail>> {
  const set = await selectSet(
    and(
      eq(palletSets.referenceNumber, referenceNumber),
      eq(palletSets.voided, false),
      setScope(actor),
    ),
  );
  if (!set) {
    return notFound();
  }
  return { ok: true, data: { ...set, pallets: await selectPallets(set.id) } };
}

export async function listSetGrowers(
  actor: Actor,
): Promise<PalletSetResult<SetGrowerOption[]>> {
  const rows = await db
    .select({ id: growers.id, name: growers.name })
    .from(growers)
    .where(
      and(
        eq(growers.isActive, true),
        sql`exists (
          select 1
          from (values ('A'::text), ('B'::text), ('C'::text)) as kind_scope(kind)
          where ${scopeForSets(actor, {
            growerId: sql`${growers.id}`,
            kind: sql`kind_scope.kind`,
          })}
        )`,
      ),
    )
    .orderBy(asc(growers.name), asc(growers.id));

  return { ok: true, data: rows };
}

export type CommonNameIds = {
  growers: string[];
  yieldTypes: string[];
  packageTypes: string[];
  palletTypes: string[];
};

/** The five names used most often on sets this actor can see. */
export async function listCommonNameIds(actor: Actor): Promise<CommonNameIds> {
  const scope = setScope(actor);
  const [growerRows, yieldRows, packageRows, palletTypeRows] = await Promise.all([
    db
      .select({ id: palletSets.growerId })
      .from(palletSets)
      .where(scope)
      .groupBy(palletSets.growerId)
      .orderBy(desc(sql`count(*)`), asc(palletSets.growerId))
      .limit(5),
    db
      .select({ id: pallets.yieldTypeId })
      .from(pallets)
      .innerJoin(palletSets, eq(pallets.setId, palletSets.id))
      .where(scope)
      .groupBy(pallets.yieldTypeId)
      .orderBy(desc(sql`count(*)`), asc(pallets.yieldTypeId))
      .limit(5),
    db
      .select({ id: pallets.packageTypeId })
      .from(pallets)
      .innerJoin(palletSets, eq(pallets.setId, palletSets.id))
      .where(scope)
      .groupBy(pallets.packageTypeId)
      .orderBy(desc(sql`count(*)`), asc(pallets.packageTypeId))
      .limit(5),
    db
      .select({ id: pallets.palletTypeId })
      .from(pallets)
      .innerJoin(palletSets, eq(pallets.setId, palletSets.id))
      .where(scope)
      .groupBy(pallets.palletTypeId)
      .orderBy(desc(sql`count(*)`), asc(pallets.palletTypeId))
      .limit(5),
  ]);
  return {
    growers: growerRows.map((row) => row.id),
    yieldTypes: yieldRows.map((row) => row.id),
    packageTypes: packageRows.map((row) => row.id),
    palletTypes: palletTypeRows.map((row) => row.id),
  };
}

export async function createPalletSet(
  actor: Actor,
  input: CreatePalletSetInput,
): Promise<PalletSetResult<CreatedPalletSet>> {
  if (input.pallets.length > MAX_PALLETS_PER_REQUEST) {
    return setTooLarge();
  }
  if (!canWriteSet(actor, input.growerId, input.kind)) {
    return readOnly();
  }

  const duplicates = duplicateNumbers(input.pallets.map((pallet) => pallet.palletNumber));
  if (duplicates.length > 0) {
    return palletNumbersDuplicate(duplicates);
  }

  const context: WriteContext = {
    referenceNumber: input.referenceNumber,
    growerId: input.growerId,
    palletNumbers: input.pallets.map((pallet) => pallet.palletNumber),
    exceptSetId: null,
  };

  try {
    return await db.transaction(async (tx) => {
      // Write scope is already true. Look up the grower only after that, so a
      // denied destination does not reveal whether the grower row exists.
      if (!(await isActiveGrower(tx, input.growerId))) {
        return inactiveReference();
      }

      const prepared = prepareNewPallets(await loadTypeCatalog(tx, input.pallets), input.pallets);
      if (prepared === "inactive") {
        return inactiveReference();
      }
      if (prepared === "negative") {
        return netWeightNegative();
      }
      if (await referenceIsTaken(tx, input.referenceNumber, null)) {
        return referenceTaken(input.referenceNumber);
      }
      const taken = await takenPalletNumbers(tx, input.growerId, context.palletNumbers, null);
      if (taken.length > 0) {
        return palletNumbersTaken(input.growerId, taken);
      }

      const setId = crypto.randomUUID();
      await tx.insert(palletSets).values({
        id: setId,
        kind: input.kind,
        referenceNumber: input.referenceNumber,
        growerId: input.growerId,
        receivedOn: input.receivedOn,
        voided: false,
        createdBy: actor.userId,
        updatedBy: actor.userId,
        revision: 1,
      });
      if (prepared.length > 0) {
        await tx.insert(pallets).values(
          prepared.map((pallet) => palletInsert(setId, input.growerId, false, pallet)),
        );
      }
      await writeAudit(tx, {
        actorUserId: actor.userId,
        action: "created",
        summary: {
          createdHeader: {
            kind: input.kind,
            referenceNumber: input.referenceNumber,
            growerId: input.growerId,
            receivedOn: input.receivedOn,
          },
          ...(prepared.length > 0 ? { added: prepared } : {}),
        },
        subjects: [
          { subjectType: "pallet_set", subjectId: setId },
          ...prepared.map((pallet) => ({ subjectType: "pallet" as const, subjectId: pallet.id })),
        ],
      });

      return {
        ok: true as const,
        data: { id: setId, revision: 1, palletIds: prepared.map((pallet) => pallet.id) },
      };
    });
  } catch (error: unknown) {
    return mapWriteError(error, context);
  }
}

export async function updatePalletSet(
  actor: Actor,
  input: UpdatePalletSetInput,
): Promise<PalletSetResult<SavedPalletSet>> {
  const context: WriteContext = { palletNumbers: [], exceptSetId: input.id };

  try {
    return await db.transaction(async (tx) => {
      const current = await lockSet(tx, actor, input.id);
      if (!current) {
        return notFound();
      }
      if (!canWriteSet(actor, current.growerId, current.kind)) {
        return readOnly();
      }
      if (current.revision !== input.revision) {
        return revisionConflict();
      }

      const next = {
        kind: input.kind ?? current.kind,
        referenceNumber: input.referenceNumber ?? current.referenceNumber,
        growerId: input.growerId ?? current.growerId,
        receivedOn: input.receivedOn ?? current.receivedOn,
      };
      if (next.kind !== current.kind || next.growerId !== current.growerId) {
        if (!canWriteSet(actor, next.growerId, next.kind)) {
          return readOnly();
        }
      }
      if (next.growerId !== current.growerId && !(await isActiveGrower(tx, next.growerId))) {
        return inactiveReference();
      }
      if (
        !current.voided &&
        next.referenceNumber !== current.referenceNumber &&
        (await referenceIsTaken(tx, next.referenceNumber, current.id))
      ) {
        return referenceTaken(next.referenceNumber);
      }

      if (!current.voided && next.growerId !== current.growerId) {
        const numbers = await loadPalletNumbers(tx, current.id);
        context.growerId = next.growerId;
        context.palletNumbers = numbers;
        context.referenceNumber = next.referenceNumber;
        const taken = await takenPalletNumbers(tx, next.growerId, numbers, current.id);
        if (taken.length > 0) {
          return palletNumbersTaken(next.growerId, taken);
        }
      }

      const header = headerChanges(current, next);
      const updated = await tx
        .update(palletSets)
        .set({
          kind: next.kind,
          referenceNumber: next.referenceNumber,
          growerId: next.growerId,
          receivedOn: next.receivedOn,
          revision: current.revision + 1,
          updatedBy: actor.userId,
          updatedAt: new Date(),
        })
        .where(and(eq(palletSets.id, current.id), eq(palletSets.revision, current.revision)))
        .returning({ revision: palletSets.revision });
      const row = updated[0];
      if (!row) {
        return revisionConflict();
      }

      await writeAudit(tx, {
        actorUserId: actor.userId,
        action: "updated",
        summary: header ? { header } : {},
        subjects: [{ subjectType: "pallet_set", subjectId: current.id }],
      });

      return { ok: true as const, data: { id: current.id, revision: row.revision } };
    });
  } catch (error: unknown) {
    return mapWriteError(error, context);
  }
}

export async function changePallets(
  actor: Actor,
  input: ChangePalletsInput,
): Promise<PalletSetResult<ChangedPallets>> {
  const requestCount = input.add.length + input.update.length + input.remove.length;
  if (requestCount > MAX_PALLETS_PER_REQUEST) {
    return setTooLarge();
  }
  if (requestCount === 0) {
    return invalidRequest();
  }

  const context: WriteContext = { palletNumbers: [], exceptSetId: input.setId };

  try {
    return await db.transaction(async (tx) => {
      const current = await lockSet(tx, actor, input.setId);
      if (!current) {
        return notFound();
      }
      if (!canWriteSet(actor, current.growerId, current.kind)) {
        return readOnly();
      }
      if (current.revision !== input.revision) {
        return revisionConflict();
      }
      if (current.voided) {
        return setVoided();
      }

      const existing = await loadPallets(tx, current.id);
      const byId = new Map(existing.map((pallet) => [pallet.id, pallet]));
      const updateIds = input.update.map((pallet) => pallet.id);
      if (
        repeated(updateIds) ||
        repeated(input.remove) ||
        input.remove.some((id) => updateIds.includes(id)) ||
        updateIds.some((id) => !byId.has(id)) ||
        input.remove.some((id) => !byId.has(id))
      ) {
        return updateIds.some((id) => !byId.has(id)) || input.remove.some((id) => !byId.has(id))
          ? notFound()
          : invalidRequest();
      }

      const removed = input.remove.map((id) => {
        const pallet = byId.get(id);
        if (!pallet) {
          throw new Error("removed pallet disappeared after the existence check");
        }
        return pallet;
      });
      const removedIds = new Set(input.remove);

      const catalog = await loadTypeCatalog(tx, [
        ...input.add,
        ...input.update.map((patch) => {
          const before = byId.get(patch.id);
          if (!before) {
            throw new Error("updated pallet disappeared after the existence check");
          }
          return {
            palletNumber: patch.palletNumber ?? before.palletNumber,
            yieldTypeId: patch.yieldTypeId ?? before.yieldTypeId,
            packageTypeId: patch.packageTypeId ?? before.packageTypeId,
            palletTypeId: patch.palletTypeId ?? before.palletTypeId,
            packageAmount: patch.packageAmount ?? before.packageAmount,
            grossWeightGrams: patch.grossWeightGrams ?? before.grossWeightGrams,
          };
        }),
      ]);

      const added = prepareNewPallets(catalog, input.add);
      if (added === "inactive") {
        return inactiveReference();
      }
      if (added === "negative") {
        return netWeightNegative();
      }

      const changed: {
        before: PalletAuditSnapshot;
        after: PalletAuditSnapshot;
        fields: PalletFieldChanges;
      }[] = [];
      for (const patch of input.update) {
        const before = byId.get(patch.id);
        if (!before) {
          return notFound();
        }
        const after = prepareUpdatedPallet(catalog, before, patch);
        if (after === "inactive") {
          return inactiveReference();
        }
        if (after === "negative") {
          return netWeightNegative();
        }
        const fields = palletChanges(before, after);
        if (Object.keys(fields).length > 0) {
          changed.push({ before, after, fields });
        }
      }

      const changedIds = new Set(changed.map((pallet) => pallet.after.id));
      const resulting = [
        ...existing.filter((pallet) => !removedIds.has(pallet.id) && !changedIds.has(pallet.id)),
        ...changed.map((pallet) => pallet.after),
        ...added,
      ];
      const duplicates = duplicateNumbers(resulting.map((pallet) => pallet.palletNumber));
      if (duplicates.length > 0) {
        return palletNumbersDuplicate(duplicates);
      }

      context.growerId = current.growerId;
      context.palletNumbers = resulting.map((pallet) => pallet.palletNumber);
      const taken = await takenPalletNumbers(
        tx,
        current.growerId,
        context.palletNumbers,
        current.id,
      );
      if (taken.length > 0) {
        return palletNumbersTaken(current.growerId, taken);
      }

      if (added.length === 0 && removed.length === 0 && changed.length === 0) {
        return {
          ok: true as const,
          data: { id: current.id, revision: current.revision, addedPalletIds: [] },
        };
      }

      if (removed.length > 0) {
        await tx
          .delete(pallets)
          .where(and(eq(pallets.setId, current.id), inArray(pallets.id, input.remove)));
      }
      for (const pallet of changed) {
        await tx
          .update(pallets)
          .set({
            palletNumber: pallet.after.palletNumber,
            yieldTypeId: pallet.after.yieldTypeId,
            packageTypeId: pallet.after.packageTypeId,
            palletTypeId: pallet.after.palletTypeId,
            packageAmount: pallet.after.packageAmount,
            grossWeightGrams: pallet.after.grossWeightGrams,
            packageTareGrams: pallet.after.packageTareGrams,
            palletTareGrams: pallet.after.palletTareGrams,
            netWeightGrams: pallet.after.netWeightGrams,
            updatedAt: new Date(),
          })
          .where(and(eq(pallets.id, pallet.after.id), eq(pallets.setId, current.id)));
      }
      if (added.length > 0) {
        await tx
          .insert(pallets)
          .values(added.map((pallet) => palletInsert(current.id, current.growerId, false, pallet)));
      }

      const revision = await bumpRevision(tx, current.id, current.revision, actor.userId);
      if (revision === null) {
        return revisionConflict();
      }

      await writeAudit(tx, {
        actorUserId: actor.userId,
        action: "updated",
        summary: {
          ...(added.length > 0 ? { added } : {}),
          ...(changed.length > 0
            ? { changed: changed.map((pallet) => ({ id: pallet.after.id, fields: pallet.fields })) }
            : {}),
          ...(removed.length > 0 ? { removed } : {}),
        },
        subjects: [
          { subjectType: "pallet_set", subjectId: current.id },
          ...added.map((pallet) => ({ subjectType: "pallet" as const, subjectId: pallet.id })),
          ...changed.map((pallet) => ({
            subjectType: "pallet" as const,
            subjectId: pallet.after.id,
          })),
          ...removed.map((pallet) => ({ subjectType: "pallet" as const, subjectId: pallet.id })),
        ],
      });

      return {
        ok: true as const,
        data: {
          id: current.id,
          revision,
          addedPalletIds: added.map((pallet) => pallet.id),
        },
      };
    });
  } catch (error: unknown) {
    return mapWriteError(error, context);
  }
}

export async function addPallets(
  actor: Actor,
  input: AddPalletsInput,
): Promise<PalletSetResult<ChangedPallets>> {
  return changePallets(actor, {
    setId: input.setId,
    revision: input.revision,
    add: input.pallets,
    update: [],
    remove: [],
  });
}

export async function updatePallets(
  actor: Actor,
  input: UpdatePalletsInput,
): Promise<PalletSetResult<ChangedPallets>> {
  return changePallets(actor, {
    setId: input.setId,
    revision: input.revision,
    add: [],
    update: input.pallets,
    remove: [],
  });
}

export async function removePallets(
  actor: Actor,
  input: RemovePalletsInput,
): Promise<PalletSetResult<ChangedPallets>> {
  return changePallets(actor, {
    setId: input.setId,
    revision: input.revision,
    add: [],
    update: [],
    remove: input.palletIds,
  });
}

export async function voidPalletSet(
  actor: Actor,
  input: VoidPalletSetInput,
): Promise<PalletSetResult<SavedPalletSet>> {
  try {
    return await db.transaction(async (tx) => {
      const current = await lockSet(tx, actor, input.id);
      if (!current) {
        return notFound();
      }
      if (!canWriteSet(actor, current.growerId, current.kind)) {
        return readOnly();
      }
      if (current.revision !== input.revision) {
        return revisionConflict();
      }
      if (current.voided) {
        return setVoided();
      }

      const updated = await tx
        .update(palletSets)
        .set({
          voided: true,
          voidedAt: new Date(),
          voidedBy: actor.userId,
          revision: current.revision + 1,
          updatedBy: actor.userId,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(palletSets.id, current.id),
            eq(palletSets.revision, current.revision),
            eq(palletSets.voided, false),
          ),
        )
        .returning({ revision: palletSets.revision });
      const row = updated[0];
      if (!row) {
        return revisionConflict();
      }

      await writeAudit(tx, {
        actorUserId: actor.userId,
        action: "voided",
        summary: { voided: { from: false, to: true } },
        subjects: [{ subjectType: "pallet_set", subjectId: current.id }],
      });

      return { ok: true as const, data: { id: current.id, revision: row.revision } };
    });
  } catch (error: unknown) {
    logPostgresFailure("pallet-set void failed", error);
    throw new Error("pallet-set void failed");
  }
}

async function listSets(
  actor: Actor,
  voided: boolean,
  input: ListPalletSetsInput,
): Promise<PalletSetResult<PalletSetPage>> {
  const window = pageWindow(input);
  if (window === "invalid") {
    return invalidRequest();
  }

  const filters: SQL[] = [eq(palletSets.voided, voided), setScope(actor)];
  if (input.kind) {
    filters.push(eq(palletSets.kind, input.kind));
  }
  if (input.growerId) {
    filters.push(eq(palletSets.growerId, input.growerId));
  }
  if (input.receivedFrom) {
    filters.push(gte(palletSets.receivedOn, input.receivedFrom));
  }
  if (input.receivedTo) {
    filters.push(lte(palletSets.receivedOn, input.receivedTo));
  }
  if (input.referenceNumber !== undefined) {
    filters.push(eq(palletSets.referenceNumber, input.referenceNumber));
  }

  const rows = await db
    .select({
      id: palletSets.id,
      kind: palletSets.kind,
      referenceNumber: palletSets.referenceNumber,
      growerId: palletSets.growerId,
      growerName: growers.name,
      receivedOn: palletSets.receivedOn,
      voided: palletSets.voided,
      revision: palletSets.revision,
    })
    .from(palletSets)
    .innerJoin(growers, eq(growers.id, palletSets.growerId))
    .where(and(...filters))
    .orderBy(desc(palletSets.receivedOn), desc(palletSets.referenceNumber), desc(palletSets.id))
    .limit(window.limit)
    .offset(window.offset);

  const sets: PalletSetSummary[] = [];
  for (const row of rows) {
    if (!isPalletKind(row.kind)) {
      throw new Error("pallet set kind is invalid");
    }
    sets.push({ ...row, kind: row.kind });
  }

  return { ok: true, data: { sets, limit: window.limit, offset: window.offset } };
}

function setScope(actor: Actor): SQL {
  return scopeForSets(actor, {
    growerId: sql`${palletSets.growerId}`,
    kind: sql`${palletSets.kind}`,
  });
}

function pageWindow(input: ListPalletSetsInput): { limit: number; offset: number } | "invalid" {
  const limit = input.limit ?? DEFAULT_PAGE_SIZE;
  const offset = input.offset ?? 0;
  if (
    !Number.isInteger(limit) ||
    !Number.isInteger(offset) ||
    limit < 1 ||
    limit > MAX_PAGE_SIZE ||
    offset < 0 ||
    offset > MAX_PAGE_OFFSET
  ) {
    return "invalid";
  }
  return { limit, offset };
}

async function selectSet(where: SQL | undefined): Promise<PalletSetSummary | null> {
  const rows = await db
    .select({
      id: palletSets.id,
      kind: palletSets.kind,
      referenceNumber: palletSets.referenceNumber,
      growerId: palletSets.growerId,
      growerName: growers.name,
      receivedOn: palletSets.receivedOn,
      voided: palletSets.voided,
      revision: palletSets.revision,
    })
    .from(palletSets)
    .innerJoin(growers, eq(growers.id, palletSets.growerId))
    .where(where)
    .limit(1);
  const row = rows[0];
  if (!row) {
    return null;
  }
  if (!isPalletKind(row.kind)) {
    throw new Error("pallet set kind is invalid");
  }
  return { ...row, kind: row.kind };
}

async function selectPallets(setId: string): Promise<PalletDetail[]> {
  return db
    .select({
      id: pallets.id,
      palletNumber: pallets.palletNumber,
      yieldTypeId: pallets.yieldTypeId,
      yieldTypeName: yieldTypes.name,
      packageTypeId: pallets.packageTypeId,
      packageTypeName: packageTypes.name,
      palletTypeId: pallets.palletTypeId,
      palletTypeName: palletTypes.name,
      packageAmount: pallets.packageAmount,
      grossWeightGrams: pallets.grossWeightGrams,
      packageTareGrams: pallets.packageTareGrams,
      palletTareGrams: pallets.palletTareGrams,
      netWeightGrams: pallets.netWeightGrams,
    })
    .from(pallets)
    .innerJoin(yieldTypes, eq(yieldTypes.id, pallets.yieldTypeId))
    .innerJoin(packageTypes, eq(packageTypes.id, pallets.packageTypeId))
    .innerJoin(palletTypes, eq(palletTypes.id, pallets.palletTypeId))
    .where(eq(pallets.setId, setId))
    .orderBy(asc(pallets.palletNumber), asc(pallets.id));
}

async function lockSet(
  tx: DbTransaction,
  actor: Actor,
  id: string,
): Promise<LockedSet | null> {
  const rows = await tx
    .select({
      id: palletSets.id,
      kind: palletSets.kind,
      referenceNumber: palletSets.referenceNumber,
      growerId: palletSets.growerId,
      receivedOn: palletSets.receivedOn,
      voided: palletSets.voided,
      revision: palletSets.revision,
    })
    .from(palletSets)
    .where(and(eq(palletSets.id, id), setScope(actor)))
    .limit(1)
    .for("update");
  const row = rows[0];
  if (!row) {
    return null;
  }
  if (!isPalletKind(row.kind)) {
    throw new Error("pallet set kind is invalid");
  }
  return { ...row, kind: row.kind };
}

async function isActiveGrower(tx: DbTransaction, growerId: string): Promise<boolean> {
  const rows = await tx
    .select({ isActive: growers.isActive })
    .from(growers)
    .where(eq(growers.id, growerId))
    .limit(1);
  return rows[0]?.isActive === true;
}

async function referenceIsTaken(
  tx: DbTransaction,
  referenceNumber: number,
  exceptSetId: string | null,
): Promise<boolean> {
  const filters: SQL[] = [
    eq(palletSets.referenceNumber, referenceNumber),
    eq(palletSets.voided, false),
  ];
  if (exceptSetId !== null) {
    filters.push(sql`${palletSets.id} <> ${exceptSetId}`);
  }
  const rows = await tx
    .select({ id: palletSets.id })
    .from(palletSets)
    .where(and(...filters))
    .limit(1);
  return rows.length > 0;
}

async function takenPalletNumbers(
  client: Selector | DbTransaction,
  growerId: string,
  numbers: number[],
  exceptSetId: string | null,
): Promise<number[]> {
  if (numbers.length === 0) {
    return [];
  }
  const filters: SQL[] = [
    eq(pallets.growerId, growerId),
    eq(pallets.voided, false),
    inArray(pallets.palletNumber, [...new Set(numbers)]),
  ];
  if (exceptSetId !== null) {
    filters.push(sql`${pallets.setId} <> ${exceptSetId}`);
  }
  const rows = await client
    .select({ palletNumber: pallets.palletNumber })
    .from(pallets)
    .where(and(...filters));
  return [...new Set(rows.map((row) => row.palletNumber))].sort((left, right) => left - right);
}

async function loadPalletNumbers(tx: DbTransaction, setId: string): Promise<number[]> {
  const rows = await tx
    .select({ palletNumber: pallets.palletNumber })
    .from(pallets)
    .where(eq(pallets.setId, setId));
  return rows.map((row) => row.palletNumber);
}

async function loadPallets(tx: DbTransaction, setId: string): Promise<PalletAuditSnapshot[]> {
  return tx
    .select({
      id: pallets.id,
      palletNumber: pallets.palletNumber,
      yieldTypeId: pallets.yieldTypeId,
      packageTypeId: pallets.packageTypeId,
      palletTypeId: pallets.palletTypeId,
      packageAmount: pallets.packageAmount,
      grossWeightGrams: pallets.grossWeightGrams,
      packageTareGrams: pallets.packageTareGrams,
      palletTareGrams: pallets.palletTareGrams,
      netWeightGrams: pallets.netWeightGrams,
    })
    .from(pallets)
    .where(eq(pallets.setId, setId))
    .for("update");
}

type TypeCatalog = {
  yields: Map<string, { isActive: boolean }>;
  packages: Map<string, { tareGrams: number | null; isActive: boolean }>;
  palletTypes: Map<string, { tareGrams: number; isActive: boolean }>;
};

async function loadTypeCatalog(
  tx: DbTransaction,
  palletsToResolve: PalletClientInput[],
): Promise<TypeCatalog> {
  const yieldIds = [...new Set(palletsToResolve.map((pallet) => pallet.yieldTypeId))];
  const packageIds = [...new Set(palletsToResolve.map((pallet) => pallet.packageTypeId))];
  const palletTypeIds = [...new Set(palletsToResolve.map((pallet) => pallet.palletTypeId))];

  // One connection owns the transaction, so these reads stay sequential.
  const yieldRows =
    yieldIds.length === 0
      ? []
      : await tx
          .select({ id: yieldTypes.id, isActive: yieldTypes.isActive })
          .from(yieldTypes)
          .where(inArray(yieldTypes.id, yieldIds));
  const packageRows =
    packageIds.length === 0
      ? []
      : await tx
          .select({
            id: packageTypes.id,
            tareGrams: packageTypes.tareGrams,
            isActive: packageTypes.isActive,
          })
          .from(packageTypes)
          .where(inArray(packageTypes.id, packageIds));
  const palletTypeRows =
    palletTypeIds.length === 0
      ? []
      : await tx
          .select({
            id: palletTypes.id,
            tareGrams: palletTypes.tareGrams,
            isActive: palletTypes.isActive,
          })
          .from(palletTypes)
          .where(inArray(palletTypes.id, palletTypeIds));

  return {
    yields: new Map(yieldRows.map((row) => [row.id, row])),
    packages: new Map(packageRows.map((row) => [row.id, row])),
    palletTypes: new Map(palletTypeRows.map((row) => [row.id, row])),
  };
}

function prepareNewPallets(
  catalog: TypeCatalog,
  input: PalletClientInput[],
): PalletAuditSnapshot[] | "inactive" | "negative" {
  const prepared: PalletAuditSnapshot[] = [];
  for (const pallet of input) {
    const resolved = resolvePallet(catalog, pallet, {
      yieldType: true,
      packageType: true,
      palletType: true,
    });
    if (resolved === "inactive" || resolved === "negative") {
      return resolved;
    }
    prepared.push({ id: crypto.randomUUID(), ...resolved });
  }
  return prepared;
}

function prepareUpdatedPallet(
  catalog: TypeCatalog,
  before: PalletAuditSnapshot,
  patch: PalletUpdateInput,
): PalletAuditSnapshot | "inactive" | "negative" {
  const next = {
    palletNumber: patch.palletNumber ?? before.palletNumber,
    yieldTypeId: patch.yieldTypeId ?? before.yieldTypeId,
    packageTypeId: patch.packageTypeId ?? before.packageTypeId,
    palletTypeId: patch.palletTypeId ?? before.palletTypeId,
    packageAmount: patch.packageAmount ?? before.packageAmount,
    grossWeightGrams: patch.grossWeightGrams ?? before.grossWeightGrams,
  };
  const resolved = resolvePallet(catalog, next, {
    yieldType: next.yieldTypeId !== before.yieldTypeId,
    packageType: next.packageTypeId !== before.packageTypeId,
    palletType: next.palletTypeId !== before.palletTypeId,
  });
  if (resolved === "inactive" || resolved === "negative") {
    return resolved;
  }
  return { id: before.id, ...resolved };
}

function resolvePallet(
  catalog: TypeCatalog,
  pallet: PalletClientInput,
  mustBeActive: { yieldType: boolean; packageType: boolean; palletType: boolean },
): Omit<PalletAuditSnapshot, "id"> | "inactive" | "negative" {
  const yieldType = catalog.yields.get(pallet.yieldTypeId);
  const packageType = catalog.packages.get(pallet.packageTypeId);
  const palletType = catalog.palletTypes.get(pallet.palletTypeId);
  if (!yieldType || !packageType || !palletType) {
    return "inactive";
  }
  if (
    (mustBeActive.yieldType && !yieldType.isActive) ||
    (mustBeActive.packageType && !packageType.isActive) ||
    (mustBeActive.palletType && !palletType.isActive)
  ) {
    return "inactive";
  }

  const packageTareGrams = packageType.tareGrams ?? 0;
  const net = netWeightGrams(
    pallet.grossWeightGrams,
    packageTareGrams,
    pallet.packageAmount,
    palletType.tareGrams,
  );
  if (net < 0) {
    return "negative";
  }

  return {
    palletNumber: pallet.palletNumber,
    yieldTypeId: pallet.yieldTypeId,
    packageTypeId: pallet.packageTypeId,
    palletTypeId: pallet.palletTypeId,
    packageAmount: pallet.packageAmount,
    grossWeightGrams: pallet.grossWeightGrams,
    packageTareGrams,
    palletTareGrams: palletType.tareGrams,
    netWeightGrams: net,
  };
}

function palletInsert(
  setId: string,
  growerId: string,
  voided: boolean,
  pallet: PalletAuditSnapshot,
) {
  return {
    id: pallet.id,
    setId,
    growerId,
    voided,
    palletNumber: pallet.palletNumber,
    yieldTypeId: pallet.yieldTypeId,
    packageTypeId: pallet.packageTypeId,
    palletTypeId: pallet.palletTypeId,
    packageAmount: pallet.packageAmount,
    grossWeightGrams: pallet.grossWeightGrams,
    packageTareGrams: pallet.packageTareGrams,
    palletTareGrams: pallet.palletTareGrams,
    netWeightGrams: pallet.netWeightGrams,
  };
}

async function bumpRevision(
  tx: DbTransaction,
  setId: string,
  revision: number,
  actorUserId: string,
): Promise<number | null> {
  const rows = await tx
    .update(palletSets)
    .set({
      revision: revision + 1,
      updatedBy: actorUserId,
      updatedAt: new Date(),
    })
    .where(and(eq(palletSets.id, setId), eq(palletSets.revision, revision)))
    .returning({ revision: palletSets.revision });
  return rows[0]?.revision ?? null;
}

function headerChanges(
  before: LockedSet,
  after: {
    kind: PalletKind;
    referenceNumber: number;
    growerId: string;
    receivedOn: string;
  },
): PalletSetAuditSummary["header"] | undefined {
  const header: NonNullable<PalletSetAuditSummary["header"]> = {};
  if (before.kind !== after.kind) {
    header.kind = { from: before.kind, to: after.kind };
  }
  if (before.referenceNumber !== after.referenceNumber) {
    header.referenceNumber = { from: before.referenceNumber, to: after.referenceNumber };
  }
  if (before.growerId !== after.growerId) {
    header.growerId = { from: before.growerId, to: after.growerId };
  }
  if (before.receivedOn !== after.receivedOn) {
    header.receivedOn = { from: before.receivedOn, to: after.receivedOn };
  }
  return Object.keys(header).length > 0 ? header : undefined;
}

function duplicateNumbers(numbers: number[]): number[] {
  const seen = new Set<number>();
  const duplicates = new Set<number>();
  for (const number of numbers) {
    if (seen.has(number)) {
      duplicates.add(number);
    }
    seen.add(number);
  }
  return [...duplicates].sort((left, right) => left - right);
}

function repeated(ids: string[]): boolean {
  return new Set(ids).size !== ids.length;
}

async function mapWriteError(
  error: unknown,
  context: WriteContext,
): Promise<PalletSetResult<never>> {
  if (isUniqueViolation(error)) {
    const constraint = postgresConstraintName(error);
    if (constraint === ACTIVE_REFERENCE_CONSTRAINT && context.referenceNumber !== undefined) {
      return referenceTaken(context.referenceNumber);
    }
    if (constraint === ACTIVE_PALLET_NUMBER_CONSTRAINT && context.growerId) {
      const numbers = await takenPalletNumbers(
        db,
        context.growerId,
        context.palletNumbers,
        context.exceptSetId,
      );
      return palletNumbersTaken(
        context.growerId,
        numbers.length > 0 ? numbers : context.palletNumbers,
      );
    }
  }
  if (isCheckViolation(error) && postgresConstraintName(error) === NET_WEIGHT_CONSTRAINT) {
    return netWeightNegative();
  }
  if (isForeignKeyViolation(error)) {
    return inactiveReference();
  }
  logPostgresFailure("pallet-set write failed", error);
  throw new Error("pallet-set write failed");
}
