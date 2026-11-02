import { eq, inArray, sql } from "drizzle-orm";
import postgres from "postgres";
import { describe, expect, it } from "vitest";

import type { Actor, PalletKind } from "@/lib/access-types";
import { isLocalDatabaseUrl } from "@/lib/database-host";
import { netWeightGrams } from "@/lib/pallet-sets/net-weight";
import type { PalletClientInput, PalletSetResult } from "@/lib/services/pallet-set-input";

if (!isLocalDatabaseUrl(process.env.DATABASE_URL ?? "")) {
  throw new Error("Refusing to run tests: DATABASE_URL host must be localhost or 127.0.0.1.");
}

const { db } = await import("@/db");
const {
  accessGrants,
  auditEvents,
  auditSubjects,
  growers,
  packageTypes,
  palletSets,
  palletTypes,
  pallets,
  user,
  yieldTypes,
} = await import("@/db/schema");
const { loadGrants } = await import("@/lib/access");
const { updateReference } = await import("@/lib/services/reference-data");
const {
  addPallets,
  createPalletSet,
  getActivePalletSetByReferenceNumber,
  getPalletSet,
  listPalletSets,
  listSetGrowers,
  listVoidedPalletSets,
  removePallets,
  updatePalletSet,
  voidPalletSet,
} = await import("@/lib/services/pallet-sets");

let sequence = 100_000_000 + Math.floor(Math.random() * 800_000_000);

function nextNumber(): number {
  sequence += 1;
  return sequence;
}

type CreatedIds = {
  userIds: string[];
  growerIds: string[];
  yieldIds: string[];
  packageIds: string[];
  palletTypeIds: string[];
};

type Fixture = {
  ids: CreatedIds;
  owner: Actor;
  growerId: string;
  otherGrowerId: string;
  yieldId: string;
  packageId: string;
  palletTypeId: string;
};

function must<T>(result: PalletSetResult<T>): T {
  if (!result.ok) {
    throw new Error(result.code);
  }
  return result.data;
}

async function withFixture(run: (fixture: Fixture) => Promise<void>): Promise<void> {
  const ids: CreatedIds = {
    userIds: [],
    growerIds: [],
    yieldIds: [],
    packageIds: [],
    palletTypeIds: [],
  };
  const userId = await insertUser(ids, "בעלים");
  try {
    const growerId = await insertGrower(ids, "מגדל");
    const otherGrowerId = await insertGrower(ids, "מגדל אחר");
    const yieldId = await insertYield(ids);
    const packageId = await insertPackage(ids, 100);
    const palletTypeId = await insertPalletType(ids, 500);
    await run({
      ids,
      owner: { userId, grants: [{ scope: "global", access: "write" }] },
      growerId,
      otherGrowerId,
      yieldId,
      packageId,
      palletTypeId,
    });
  } finally {
    await cleanup(ids);
  }
}

async function insertUser(ids: CreatedIds, name: string): Promise<string> {
  const userId = crypto.randomUUID();
  await db.insert(user).values({
    id: userId,
    name,
    email: `${userId}@nahala.test`,
    emailVerified: false,
  });
  ids.userIds.push(userId);
  return userId;
}

async function insertGrower(ids: CreatedIds, name: string, isActive = true): Promise<string> {
  const rows = await db
    .insert(growers)
    .values({ name: `${name} ${crypto.randomUUID()}`, isActive })
    .returning({ id: growers.id });
  const row = rows[0];
  if (!row) {
    throw new Error("grower insert failed");
  }
  ids.growerIds.push(row.id);
  return row.id;
}

async function insertYield(ids: CreatedIds, isActive = true): Promise<string> {
  const rows = await db
    .insert(yieldTypes)
    .values({ name: `יבול ${crypto.randomUUID()}`, isActive })
    .returning({ id: yieldTypes.id });
  const row = rows[0];
  if (!row) {
    throw new Error("yield insert failed");
  }
  ids.yieldIds.push(row.id);
  return row.id;
}

async function insertPackage(ids: CreatedIds, tareGrams: number | null): Promise<string> {
  const rows = await db
    .insert(packageTypes)
    .values({ name: `אריזה ${crypto.randomUUID()}`, tareGrams, isActive: true })
    .returning({ id: packageTypes.id });
  const row = rows[0];
  if (!row) {
    throw new Error("package insert failed");
  }
  ids.packageIds.push(row.id);
  return row.id;
}

async function insertPalletType(ids: CreatedIds, tareGrams: number): Promise<string> {
  const rows = await db
    .insert(palletTypes)
    .values({ name: `משטח ${crypto.randomUUID()}`, tareGrams, isActive: true })
    .returning({ id: palletTypes.id });
  const row = rows[0];
  if (!row) {
    throw new Error("pallet type insert failed");
  }
  ids.palletTypeIds.push(row.id);
  return row.id;
}

async function cleanup(ids: CreatedIds): Promise<void> {
  if (ids.userIds.length > 0) {
    const sets = await db
      .select({ id: palletSets.id })
      .from(palletSets)
      .where(inArray(palletSets.createdBy, ids.userIds));
    const setIds = sets.map((set) => set.id);
    if (setIds.length > 0) {
      await db.delete(pallets).where(inArray(pallets.setId, setIds));
      await db.delete(palletSets).where(inArray(palletSets.id, setIds));
    }
    const events = await db
      .select({ id: auditEvents.id })
      .from(auditEvents)
      .where(inArray(auditEvents.actorUserId, ids.userIds));
    const eventIds = events.map((event) => event.id);
    if (eventIds.length > 0) {
      await db.delete(auditSubjects).where(inArray(auditSubjects.eventId, eventIds));
      await db.delete(auditEvents).where(inArray(auditEvents.id, eventIds));
    }
    await db.delete(accessGrants).where(inArray(accessGrants.userId, ids.userIds));
  }
  if (ids.palletTypeIds.length > 0) {
    await db.delete(palletTypes).where(inArray(palletTypes.id, ids.palletTypeIds));
  }
  if (ids.packageIds.length > 0) {
    await db.delete(packageTypes).where(inArray(packageTypes.id, ids.packageIds));
  }
  if (ids.yieldIds.length > 0) {
    await db.delete(yieldTypes).where(inArray(yieldTypes.id, ids.yieldIds));
  }
  if (ids.growerIds.length > 0) {
    await db.delete(growers).where(inArray(growers.id, ids.growerIds));
  }
  if (ids.userIds.length > 0) {
    await db.delete(user).where(inArray(user.id, ids.userIds));
  }
}

function palletOf(fixture: Fixture, overrides: Partial<PalletClientInput> = {}): PalletClientInput {
  return {
    palletNumber: nextNumber(),
    yieldTypeId: fixture.yieldId,
    packageTypeId: fixture.packageId,
    palletTypeId: fixture.palletTypeId,
    packageAmount: 10,
    grossWeightGrams: 20_000,
    ...overrides,
  };
}

async function actorFromDatabase(userId: string): Promise<Actor> {
  return { userId, grants: await loadGrants(userId) };
}

async function storedPallet(id: string) {
  const rows = await db
    .select({
      packageTareGrams: pallets.packageTareGrams,
      palletTareGrams: pallets.palletTareGrams,
      netWeightGrams: pallets.netWeightGrams,
      voided: pallets.voided,
      formula: sql<number>`${pallets.grossWeightGrams} - ${pallets.packageTareGrams} * ${pallets.packageAmount} - ${pallets.palletTareGrams}`,
    })
    .from(pallets)
    .where(eq(pallets.id, id));
  return rows[0];
}

async function auditCount(userId: string): Promise<number> {
  const rows = await db
    .select({ id: auditEvents.id })
    .from(auditEvents)
    .where(eq(auditEvents.actorUserId, userId));
  return rows.length;
}

describe("pallet set services", () => {
  it("stores the shared net weight, including zero, and rejects a negative active save", async () => {
    await withFixture(async (fixture) => {
      const positive = palletOf(fixture, { grossWeightGrams: 20_000, packageAmount: 10 });
      const created = must(
        await createPalletSet(fixture.owner, {
          kind: "A",
          referenceNumber: nextNumber(),
          growerId: fixture.growerId,
          receivedOn: "2026-01-10",
          pallets: [positive],
        }),
      );
      const palletId = created.palletIds[0];
      if (!palletId) {
        throw new Error("missing pallet id");
      }
      const stored = await storedPallet(palletId);
      const expected = netWeightGrams(20_000, 100, 10, 500);
      expect(stored?.netWeightGrams).toBe(expected);
      expect(stored?.formula).toBe(expected);
      expect(stored?.packageTareGrams).toBe(100);

      const barePackageId = await insertPackage(fixture.ids, null);
      const zeroGross = netWeightGrams(0, 0, 4, 500);
      expect(zeroGross).toBe(-500);
      const zeroPallet = palletOf(fixture, {
        packageTypeId: barePackageId,
        packageAmount: 4,
        grossWeightGrams: 500,
      });
      const zeroSet = must(
        await createPalletSet(fixture.owner, {
          kind: "B",
          referenceNumber: nextNumber(),
          growerId: fixture.growerId,
          receivedOn: "2026-01-11",
          pallets: [zeroPallet],
        }),
      );
      const zeroId = zeroSet.palletIds[0];
      if (!zeroId) {
        throw new Error("missing zero pallet");
      }
      const zeroStored = await storedPallet(zeroId);
      expect(zeroStored?.packageTareGrams).toBe(0);
      expect(zeroStored?.netWeightGrams).toBe(0);
      expect(zeroStored?.formula).toBe(netWeightGrams(500, 0, 4, 500));

      const before = await auditCount(fixture.owner.userId);
      const negative = await createPalletSet(fixture.owner, {
        kind: "A",
        referenceNumber: nextNumber(),
        growerId: fixture.growerId,
        receivedOn: "2026-01-12",
        pallets: [palletOf(fixture, { grossWeightGrams: 100, packageAmount: 10 })],
      });
      expect(negative).toMatchObject({ ok: false, code: "NET_WEIGHT_NEGATIVE" });
      expect(await auditCount(fixture.owner.userId)).toBe(before);
      const listed = must(await listPalletSets(fixture.owner, { growerId: fixture.growerId }));
      expect(listed.sets.some((set) => set.receivedOn === "2026-01-12")).toBe(false);
    });
  });

  it("keeps an empty set active through add and remove, and blocks a voided add", async () => {
    await withFixture(async (fixture) => {
      const referenceNumber = nextNumber();
      const created = must(
        await createPalletSet(fixture.owner, {
          kind: "A",
          referenceNumber,
          growerId: fixture.growerId,
          receivedOn: "2026-02-01",
          pallets: [],
        }),
      );
      expect(created.palletIds).toEqual([]);
      const listed = must(await listPalletSets(fixture.owner, { referenceNumber }));
      expect(listed.sets.map((set) => set.id)).toEqual([created.id]);

      const added = must(
        await addPallets(fixture.owner, {
          setId: created.id,
          revision: created.revision,
          pallets: [palletOf(fixture, { palletNumber: 41, grossWeightGrams: 8_000 })],
        }),
      );
      const palletId = added.addedPalletIds[0];
      if (!palletId) {
        throw new Error("missing added pallet");
      }
      const removed = must(
        await removePallets(fixture.owner, {
          setId: created.id,
          revision: added.revision,
          palletIds: [palletId],
        }),
      );
      expect(removed.revision).toBe(added.revision + 1);
      const detail = must(await getPalletSet(fixture.owner, created.id));
      expect(detail.voided).toBe(false);
      expect(detail.referenceNumber).toBe(referenceNumber);
      expect(detail.pallets).toEqual([]);
      const live = await db.select({ id: pallets.id }).from(pallets).where(eq(pallets.id, palletId));
      expect(live).toEqual([]);

      const events = await db
        .select({ id: auditEvents.id, summary: auditEvents.summary })
        .from(auditEvents)
        .where(eq(auditEvents.actorUserId, fixture.owner.userId))
        .orderBy(auditEvents.at);
      const removal = events.at(-1);
      if (!removal) {
        throw new Error("missing removal audit");
      }
      const subjects = await db
        .select({ subjectId: auditSubjects.subjectId, subjectType: auditSubjects.subjectType })
        .from(auditSubjects)
        .where(eq(auditSubjects.eventId, removal.id));
      expect(subjects).toContainEqual({ subjectType: "pallet", subjectId: palletId });
      expect(removal.summary).toMatchObject({
        removed: [{ id: palletId, palletNumber: 41, grossWeightGrams: 8_000 }],
      });

      const voided = must(await voidPalletSet(fixture.owner, { id: created.id, revision: removed.revision }));
      const blocked = await addPallets(fixture.owner, {
        setId: created.id,
        revision: voided.revision,
        pallets: [palletOf(fixture)],
      });
      expect(blocked).toMatchObject({ ok: false, code: "SET_VOIDED" });
      expect(await auditCount(fixture.owner.userId)).toBe(events.length + 1);
    });
  });

  it("does not change the pallet count on a header update, and a stale revision writes nothing", async () => {
    await withFixture(async (fixture) => {
      const created = must(
        await createPalletSet(fixture.owner, {
          kind: "A",
          referenceNumber: nextNumber(),
          growerId: fixture.growerId,
          receivedOn: "2026-03-01",
          pallets: [palletOf(fixture)],
        }),
      );
      const before = await auditCount(fixture.owner.userId);
      const stale = await updatePalletSet(fixture.owner, {
        id: created.id,
        revision: 99,
        receivedOn: "2026-03-02",
      });
      expect(stale).toMatchObject({ ok: false, code: "SET_REVISION_CONFLICT" });
      expect(await auditCount(fixture.owner.userId)).toBe(before);
      const unchanged = must(await getPalletSet(fixture.owner, created.id));
      expect(unchanged.receivedOn).toBe("2026-03-01");
      expect(unchanged.pallets).toHaveLength(1);

      const updated = must(
        await updatePalletSet(fixture.owner, {
          id: created.id,
          revision: created.revision,
          receivedOn: "2026-03-15",
          kind: "C",
        }),
      );
      const after = must(await getPalletSet(fixture.owner, created.id));
      expect(after.revision).toBe(updated.revision);
      expect(after.pallets).toHaveLength(1);
      expect(after.pallets[0]?.id).toBe(created.palletIds[0]);
      expect(after.kind).toBe("C");
      expect(after.receivedOn).toBe("2026-03-15");
    });
  });

  it("reports every colliding pallet number, allows the same number for two growers, and reuses numbers after void", async () => {
    await withFixture(async (fixture) => {
      const shared = nextNumber();
      const other = nextNumber();
      const first = must(
        await createPalletSet(fixture.owner, {
          kind: "A",
          referenceNumber: nextNumber(),
          growerId: fixture.growerId,
          receivedOn: "2026-04-01",
          pallets: [
            palletOf(fixture, { palletNumber: shared }),
            palletOf(fixture, { palletNumber: other }),
          ],
        }),
      );
      const duplicate = await createPalletSet(fixture.owner, {
        kind: "B",
        referenceNumber: nextNumber(),
        growerId: fixture.growerId,
        receivedOn: "2026-04-02",
        pallets: [
          palletOf(fixture, { palletNumber: shared }),
          palletOf(fixture, { palletNumber: other }),
          palletOf(fixture, { palletNumber: nextNumber() }),
        ],
      });
      expect(duplicate).toMatchObject({
        ok: false,
        code: "PALLET_NUMBER_TAKEN",
        growerId: fixture.growerId,
        palletNumbers: [shared, other].sort((left, right) => left - right),
      });

      const secondGrower = must(
        await createPalletSet(fixture.owner, {
          kind: "A",
          referenceNumber: nextNumber(),
          growerId: fixture.otherGrowerId,
          receivedOn: "2026-04-03",
          pallets: [palletOf(fixture, { palletNumber: shared })],
        }),
      );
      expect(secondGrower.palletIds).toHaveLength(1);

      const repeated = await createPalletSet(fixture.owner, {
        kind: "A",
        referenceNumber: nextNumber(),
        growerId: fixture.growerId,
        receivedOn: "2026-04-04",
        pallets: [
          palletOf(fixture, { palletNumber: 7 }),
          palletOf(fixture, { palletNumber: 7 }),
        ],
      });
      expect(repeated).toMatchObject({
        ok: false,
        code: "PALLET_NUMBER_DUPLICATE",
        palletNumbers: [7],
      });

      const voided = must(await voidPalletSet(fixture.owner, { id: first.id, revision: first.revision }));
      const reusedReference = first.id;
      const detail = must(await getPalletSet(fixture.owner, reusedReference));
      expect(detail.voided).toBe(true);
      const oldReference = detail.referenceNumber;
      const lookupMiss = await getActivePalletSetByReferenceNumber(fixture.owner, oldReference);
      expect(lookupMiss).toMatchObject({ ok: false, code: "NOT_FOUND" });

      const replacement = must(
        await createPalletSet(fixture.owner, {
          kind: "C",
          referenceNumber: oldReference,
          growerId: fixture.growerId,
          receivedOn: "2026-04-05",
          pallets: [palletOf(fixture, { palletNumber: shared })],
        }),
      );
      const active = must(await getActivePalletSetByReferenceNumber(fixture.owner, oldReference));
      expect(active.id).toBe(replacement.id);
      expect(active.voided).toBe(false);
      const old = must(await getPalletSet(fixture.owner, first.id));
      expect(old.voided).toBe(true);
      expect(voided.revision).toBe(first.revision + 1);
      const voidedPallet = await storedPallet(first.palletIds[0] ?? "");
      expect(voidedPallet?.voided).toBe(true);
    });
  });

  it("lists active and voided sets in a stable order and filters in the query", async () => {
    await withFixture(async (fixture) => {
      const older = nextNumber();
      const newer = nextNumber();
      const middle = nextNumber();
      await createPalletSet(fixture.owner, {
        kind: "A",
        referenceNumber: older,
        growerId: fixture.growerId,
        receivedOn: "2026-01-05",
        pallets: [],
      });
      const newest = must(
        await createPalletSet(fixture.owner, {
          kind: "B",
          referenceNumber: newer,
          growerId: fixture.otherGrowerId,
          receivedOn: "2026-03-05",
          pallets: [],
        }),
      );
      await createPalletSet(fixture.owner, {
        kind: "A",
        referenceNumber: middle,
        growerId: fixture.growerId,
        receivedOn: "2026-02-05",
        pallets: [],
      });

      const page = must(
        await listPalletSets(fixture.owner, { growerId: fixture.growerId, limit: 10, offset: 0 }),
      );
      expect(page.sets.map((set) => set.referenceNumber)).toEqual([middle, older]);
      const byKind = must(await listPalletSets(fixture.owner, { kind: "B", growerId: fixture.otherGrowerId }));
      expect(byKind.sets.map((set) => set.id)).toEqual([newest.id]);
      const byDate = must(
        await listPalletSets(fixture.owner, {
          growerId: fixture.growerId,
          receivedFrom: "2026-02-01",
          receivedTo: "2026-02-28",
        }),
      );
      expect(byDate.sets.map((set) => set.referenceNumber)).toEqual([middle]);
      const exact = must(await listPalletSets(fixture.owner, { referenceNumber: newer }));
      expect(exact.sets.map((set) => set.id)).toEqual([newest.id]);

      const firstPage = must(
        await listPalletSets(fixture.owner, {
          growerId: fixture.growerId,
          limit: 1,
          offset: 0,
        }),
      );
      expect(firstPage.sets.map((set) => set.referenceNumber)).toEqual([middle]);
      expect(firstPage.limit).toBe(1);

      expect(must(await listVoidedPalletSets(fixture.owner, { referenceNumber: newer })).sets).toEqual([]);
      const current = must(await getPalletSet(fixture.owner, newest.id));
      await voidPalletSet(fixture.owner, { id: newest.id, revision: current.revision });
      expect(must(await listPalletSets(fixture.owner, { referenceNumber: newer })).sets).toEqual([]);
      expect(must(await listVoidedPalletSets(fixture.owner, { referenceNumber: newer })).sets).toHaveLength(1);
    });
  });

  it("refuses a deactivated reference on a new pallet and still shows its name", async () => {
    await withFixture(async (fixture) => {
      const created = must(
        await createPalletSet(fixture.owner, {
          kind: "A",
          referenceNumber: nextNumber(),
          growerId: fixture.growerId,
          receivedOn: "2026-05-01",
          pallets: [palletOf(fixture)],
        }),
      );
      await db.update(yieldTypes).set({ isActive: false }).where(eq(yieldTypes.id, fixture.yieldId));
      const blocked = await addPallets(fixture.owner, {
        setId: created.id,
        revision: created.revision,
        pallets: [palletOf(fixture)],
      });
      expect(blocked).toMatchObject({ ok: false, code: "INACTIVE_REFERENCE" });
      const detail = must(await getPalletSet(fixture.owner, created.id));
      expect(detail.pallets[0]?.yieldTypeName.length).toBeGreaterThan(0);
      expect(detail.pallets).toHaveLength(1);
    });
  });

  it("updates voided tares in one pass and leaves active pallets stored as saved", async () => {
    await withFixture(async (fixture) => {
      const active = palletOf(fixture, { packageAmount: 2, grossWeightGrams: 5_000 });
      const staysPositive = palletOf(fixture, { packageAmount: 2, grossWeightGrams: 5_000 });
      const goesNegative = palletOf(fixture, { packageAmount: 10, grossWeightGrams: 5_000 });
      const created = must(
        await createPalletSet(fixture.owner, {
          kind: "A",
          referenceNumber: nextNumber(),
          growerId: fixture.growerId,
          receivedOn: "2026-06-01",
          pallets: [active, staysPositive, goesNegative],
        }),
      );
      const [activeId, positiveId, negativeId] = created.palletIds;
      if (!activeId || !positiveId || !negativeId) {
        throw new Error("missing tare pallets");
      }
      await voidPalletSet(fixture.owner, { id: created.id, revision: created.revision });
      const activeOnly = must(
        await createPalletSet(fixture.owner, {
          kind: "B",
          referenceNumber: nextNumber(),
          growerId: fixture.growerId,
          receivedOn: "2026-06-02",
          pallets: [palletOf(fixture, { packageAmount: 2, grossWeightGrams: 5_000 })],
        }),
      );
      const activePalletId = activeOnly.palletIds[0];
      if (!activePalletId) {
        throw new Error("missing active pallet");
      }

      const updated = await updateReference(fixture.owner, {
        table: "package_types",
        id: fixture.packageId,
        tareGrams: 1_000,
      });
      expect(updated.ok).toBe(true);

      const activeRow = await storedPallet(activePalletId);
      expect(activeRow?.packageTareGrams).toBe(100);
      expect(activeRow?.netWeightGrams).toBe(netWeightGrams(5_000, 100, 2, 500));
      const positiveRow = await storedPallet(positiveId);
      expect(positiveRow?.packageTareGrams).toBe(1_000);
      expect(positiveRow?.netWeightGrams).toBe(netWeightGrams(5_000, 1_000, 2, 500));
      const negativeRow = await storedPallet(negativeId);
      expect(negativeRow?.packageTareGrams).toBe(1_000);
      expect(negativeRow?.netWeightGrams).toBe(0);
      expect(netWeightGrams(5_000, 1_000, 10, 500)).toBeLessThan(0);

      const cleared = await updateReference(fixture.owner, {
        table: "package_types",
        id: fixture.packageId,
        tareGrams: null,
      });
      expect(cleared.ok).toBe(true);
      expect((await storedPallet(negativeId))?.packageTareGrams).toBe(0);
      expect((await storedPallet(negativeId))?.netWeightGrams).toBe(netWeightGrams(5_000, 0, 10, 500));
      expect((await storedPallet(activePalletId))?.packageTareGrams).toBe(100);

      const tareEvents = await db
        .select({ id: auditEvents.id, action: auditEvents.action })
        .from(auditEvents)
        .where(eq(auditEvents.actorUserId, fixture.owner.userId));
      const packageEvents = tareEvents.filter((event) => event.action === "tare_changed");
      expect(packageEvents).toHaveLength(2);
      const subjects = await db
        .select({ subjectType: auditSubjects.subjectType, subjectId: auditSubjects.subjectId })
        .from(auditSubjects)
        .where(eq(auditSubjects.eventId, packageEvents[0]?.id ?? ""));
      expect(subjects).toEqual([{ subjectType: "package_type", subjectId: fixture.packageId }]);
    });
  });

  it("clamps a voided pallet-type tare and does not rewrite active rows", async () => {
    await withFixture(async (fixture) => {
      const lightType = await insertPalletType(fixture.ids, 100);
      const created = must(
        await createPalletSet(fixture.owner, {
          kind: "A",
          referenceNumber: nextNumber(),
          growerId: fixture.growerId,
          receivedOn: "2026-06-03",
          pallets: [
            palletOf(fixture, {
              palletTypeId: lightType,
              packageAmount: 1,
              grossWeightGrams: 5_000,
            }),
            palletOf(fixture, {
              palletTypeId: lightType,
              packageAmount: 1,
              grossWeightGrams: 200,
            }),
          ],
        }),
      );
      await voidPalletSet(fixture.owner, { id: created.id, revision: created.revision });
      const active = must(
        await createPalletSet(fixture.owner, {
          kind: "A",
          referenceNumber: nextNumber(),
          growerId: fixture.otherGrowerId,
          receivedOn: "2026-06-04",
          pallets: [
            palletOf(fixture, {
              palletTypeId: lightType,
              packageAmount: 1,
              grossWeightGrams: 5_000,
            }),
          ],
        }),
      );
      const updated = await updateReference(fixture.owner, {
        table: "pallet_types",
        id: lightType,
        tareGrams: 500,
      });
      expect(updated.ok).toBe(true);
      const [positiveId, negativeId] = created.palletIds;
      expect((await storedPallet(positiveId ?? ""))?.netWeightGrams).toBe(netWeightGrams(5_000, 100, 1, 500));
      expect((await storedPallet(negativeId ?? ""))?.palletTareGrams).toBe(500);
      expect((await storedPallet(negativeId ?? ""))?.netWeightGrams).toBe(0);
      expect((await storedPallet(active.palletIds[0] ?? ""))?.palletTareGrams).toBe(100);
    });
  });
});

describe("pallet set access", () => {
  it("hides every set when the user has no grants", async () => {
    await withFixture(async (fixture) => {
      const created = must(
        await createPalletSet(fixture.owner, {
          kind: "A",
          referenceNumber: nextNumber(),
          growerId: fixture.growerId,
          receivedOn: "2026-07-01",
          pallets: [palletOf(fixture)],
        }),
      );
      const userId = await insertUser(fixture.ids, "ללא הרשאה");
      const actor = await actorFromDatabase(userId);
      expect(actor.grants).toEqual([]);
      const listed = must(await listPalletSets(actor));
      expect(listed.sets).toEqual([]);
      const missing = await getPalletSet(actor, crypto.randomUUID());
      const hidden = await getPalletSet(actor, created.id);
      expect(hidden).toEqual(missing);
      expect(hidden).toMatchObject({ ok: false, code: "NOT_FOUND", message: "הרשומה לא נמצאה" });
      const lookup = await getActivePalletSetByReferenceNumber(actor, nextNumber());
      const byNumber = await getActivePalletSetByReferenceNumber(
        actor,
        must(await getPalletSet(fixture.owner, created.id)).referenceNumber,
      );
      expect(byNumber).toEqual(lookup);
      expect(await createPalletSet(actor, {
        kind: "A",
        referenceNumber: nextNumber(),
        growerId: fixture.growerId,
        receivedOn: "2026-07-02",
        pallets: [],
      })).toMatchObject({ ok: false, code: "READ_ONLY" });
      expect(must(await listSetGrowers(actor))).toEqual([]);
    });
  });

  it("limits a grower write grant to that grower's sets and dropdown", async () => {
    await withFixture(async (fixture) => {
      const userId = await insertUser(fixture.ids, "מגדל אחד");
      await db.insert(accessGrants).values({
        userId,
        scope: "palletSets",
        access: "write",
        growerId: fixture.growerId,
        kind: null,
      });
      const actor = await actorFromDatabase(userId);
      const own = must(
        await createPalletSet(actor, {
          kind: "C",
          referenceNumber: nextNumber(),
          growerId: fixture.growerId,
          receivedOn: "2026-07-03",
          pallets: [],
        }),
      );
      const foreign = must(
        await createPalletSet(fixture.owner, {
          kind: "A",
          referenceNumber: nextNumber(),
          growerId: fixture.otherGrowerId,
          receivedOn: "2026-07-04",
          pallets: [],
        }),
      );
      const visible = must(await listPalletSets(actor));
      expect(visible.sets.map((set) => set.id)).toContain(own.id);
      expect(visible.sets.map((set) => set.id)).not.toContain(foreign.id);
      expect(await getPalletSet(actor, foreign.id)).toMatchObject({ ok: false, code: "NOT_FOUND" });
      expect(
        await getActivePalletSetByReferenceNumber(
          actor,
          must(await getPalletSet(fixture.owner, foreign.id)).referenceNumber,
        ),
      ).toMatchObject({ ok: false, code: "NOT_FOUND" });
      expect(
        await addPallets(actor, {
          setId: foreign.id,
          revision: foreign.revision,
          pallets: [palletOf(fixture)],
        }),
      ).toMatchObject({ ok: false, code: "NOT_FOUND" });
      expect(must(await listSetGrowers(actor)).map((grower) => grower.id)).toEqual([fixture.growerId]);
    });
  });

  it("lets a kind B reader see every grower's B sets and not change them", async () => {
    await withFixture(async (fixture) => {
      const userId = await insertUser(fixture.ids, "קריאה ב");
      await db.insert(accessGrants).values({
        userId,
        scope: "palletSets",
        access: "read",
        growerId: null,
        kind: "B",
      });
      const actor = await actorFromDatabase(userId);
      const bee = must(
        await createPalletSet(fixture.owner, {
          kind: "B",
          referenceNumber: nextNumber(),
          growerId: fixture.otherGrowerId,
          receivedOn: "2026-07-05",
          pallets: [],
        }),
      );
      const aye = must(
        await createPalletSet(fixture.owner, {
          kind: "A",
          referenceNumber: nextNumber(),
          growerId: fixture.growerId,
          receivedOn: "2026-07-06",
          pallets: [palletOf(fixture)],
        }),
      );
      const visible = must(await listPalletSets(actor));
      expect(visible.sets.map((set) => set.id)).toContain(bee.id);
      expect(visible.sets.map((set) => set.id)).not.toContain(aye.id);
      expect(await getPalletSet(actor, aye.id)).toMatchObject({ ok: false, code: "NOT_FOUND" });
      expect(
        await addPallets(actor, { setId: bee.id, revision: bee.revision, pallets: [palletOf(fixture)] }),
      ).toMatchObject({ ok: false, code: "READ_ONLY" });
      expect(
        await removePallets(actor, { setId: aye.id, revision: aye.revision, palletIds: aye.palletIds }),
      ).toMatchObject({ ok: false, code: "NOT_FOUND" });
      expect(await voidPalletSet(actor, { id: bee.id, revision: bee.revision })).toMatchObject({
        ok: false,
        code: "READ_ONLY",
      });
      expect(
        await updatePalletSet(actor, { id: bee.id, revision: bee.revision, receivedOn: "2026-07-07" }),
      ).toMatchObject({ ok: false, code: "READ_ONLY" });
      expect(must(await getPalletSet(fixture.owner, bee.id)).receivedOn).toBe("2026-07-05");
      const growersListed = must(await listSetGrowers(actor)).map((grower) => grower.id);
      expect(growersListed).toContain(fixture.growerId);
      expect(growersListed).toContain(fixture.otherGrowerId);
    });
  });

  it("unions grants and denies a move outside the write scope without naming the grower", async () => {
    await withFixture(async (fixture) => {
      const thirdGrowerId = await insertGrower(fixture.ids, "מגדל שלישי");
      const userId = await insertUser(fixture.ids, "איחוד");
      await db.insert(accessGrants).values([
        {
          userId,
          scope: "palletSets",
          access: "write",
          growerId: fixture.growerId,
          kind: "A",
        },
        {
          userId,
          scope: "palletSets",
          access: "read",
          growerId: fixture.otherGrowerId,
          kind: "C",
        },
      ]);
      const actor = await actorFromDatabase(userId);
      const writable = must(
        await createPalletSet(actor, {
          kind: "A",
          referenceNumber: nextNumber(),
          growerId: fixture.growerId,
          receivedOn: "2026-08-01",
          pallets: [palletOf(fixture)],
        }),
      );
      const readable = must(
        await createPalletSet(fixture.owner, {
          kind: "C",
          referenceNumber: nextNumber(),
          growerId: fixture.otherGrowerId,
          receivedOn: "2026-08-02",
          pallets: [],
        }),
      );
      const hidden = must(
        await createPalletSet(fixture.owner, {
          kind: "A",
          referenceNumber: nextNumber(),
          growerId: fixture.otherGrowerId,
          receivedOn: "2026-08-03",
          pallets: [],
        }),
      );
      expect(must(await getPalletSet(actor, readable.id)).kind).toBe("C");
      expect(
        await updatePalletSet(actor, { id: readable.id, revision: readable.revision, receivedOn: "2026-08-04" }),
      ).toMatchObject({ ok: false, code: "READ_ONLY" });
      expect(await getPalletSet(actor, hidden.id)).toMatchObject({ ok: false, code: "NOT_FOUND" });

      const outside = await updatePalletSet(actor, {
        id: writable.id,
        revision: writable.revision,
        growerId: thirdGrowerId,
      });
      const missing = await updatePalletSet(actor, {
        id: writable.id,
        revision: writable.revision,
        growerId: crypto.randomUUID(),
      });
      expect(outside).toEqual(missing);
      expect(outside).toEqual({
        ok: false,
        code: "READ_ONLY",
        message: "אין הרשאה לבצע את הפעולה",
      });
      expect(must(await getPalletSet(fixture.owner, writable.id)).growerId).toBe(fixture.growerId);
      expect(must(await listSetGrowers(actor)).map((grower) => grower.id).sort()).toEqual(
        [fixture.growerId, fixture.otherGrowerId].sort(),
      );
    });
  });

  it("gives global read every set and no writes, and global write the rest", async () => {
    await withFixture(async (fixture) => {
      const created = must(
        await createPalletSet(fixture.owner, {
          kind: "A",
          referenceNumber: nextNumber(),
          growerId: fixture.growerId,
          receivedOn: "2026-08-05",
          pallets: [],
        }),
      );
      const readerId = await insertUser(fixture.ids, "קריאה");
      await db.insert(accessGrants).values({ userId: readerId, scope: "global", access: "read" });
      const reader = await actorFromDatabase(readerId);
      expect(must(await listPalletSets(reader)).sets.map((set) => set.id)).toContain(created.id);
      expect(
        await updatePalletSet(reader, { id: created.id, revision: created.revision, kind: "B" }),
      ).toMatchObject({ ok: false, code: "READ_ONLY" });

      const writerId = await insertUser(fixture.ids, "כתיבה");
      await db.insert(accessGrants).values({ userId: writerId, scope: "global", access: "write" });
      const writer = await actorFromDatabase(writerId);
      const own = must(
        await createPalletSet(writer, {
          kind: "B",
          referenceNumber: nextNumber(),
          growerId: fixture.otherGrowerId,
          receivedOn: "2026-08-06",
          pallets: [palletOf(fixture)],
        }),
      );
      expect(must(await voidPalletSet(writer, { id: own.id, revision: own.revision })).revision).toBe(2);
    });
  });

  it("lets a package grant change that tare and not a set", async () => {
    await withFixture(async (fixture) => {
      const created = must(
        await createPalletSet(fixture.owner, {
          kind: "A",
          referenceNumber: nextNumber(),
          growerId: fixture.growerId,
          receivedOn: "2026-08-07",
          pallets: [palletOf(fixture, { packageAmount: 2, grossWeightGrams: 5_000 })],
        }),
      );
      await voidPalletSet(fixture.owner, { id: created.id, revision: created.revision });
      const userId = await insertUser(fixture.ids, "אריזה");
      await db.insert(accessGrants).values({
        userId,
        scope: "reference",
        access: "write",
        referenceTable: "package_types",
      });
      const actor = await actorFromDatabase(userId);
      const growerWrite = await updateReference(actor, {
        table: "growers",
        id: fixture.growerId,
        name: `חסום ${crypto.randomUUID()}`,
      });
      expect(growerWrite).toMatchObject({ ok: false, code: "FORBIDDEN" });
      expect(
        await createPalletSet(actor, {
          kind: "A",
          referenceNumber: nextNumber(),
          growerId: fixture.growerId,
          receivedOn: "2026-08-08",
          pallets: [],
        }),
      ).toMatchObject({ ok: false, code: "READ_ONLY" });
      expect(
        await addPallets(actor, {
          setId: created.id,
          revision: 2,
          pallets: [palletOf(fixture)],
        }),
      ).toMatchObject({ ok: false, code: "NOT_FOUND" });

      const tare = await updateReference(actor, {
        table: "package_types",
        id: fixture.packageId,
        tareGrams: 1_000,
      });
      expect(tare.ok).toBe(true);
      expect((await storedPallet(created.palletIds[0] ?? ""))?.packageTareGrams).toBe(1_000);
      const events = await db
        .select({ id: auditEvents.id })
        .from(auditEvents)
        .where(eq(auditEvents.actorUserId, userId));
      expect(events).toHaveLength(1);
    });
  });

  it("lets a read grant and a write grant on the same pair write", async () => {
    await withFixture(async (fixture) => {
      const userId = await insertUser(fixture.ids, "כתיבה גוברת");
      await db.insert(accessGrants).values([
        {
          userId,
          scope: "palletSets",
          access: "read",
          growerId: fixture.growerId,
          kind: "A" satisfies PalletKind,
        },
        {
          userId,
          scope: "palletSets",
          access: "write",
          growerId: fixture.growerId,
          kind: "A",
        },
      ]);
      const actor = await actorFromDatabase(userId);
      const created = await createPalletSet(actor, {
        kind: "A",
        referenceNumber: nextNumber(),
        growerId: fixture.growerId,
        receivedOn: "2026-08-09",
        pallets: [],
      });
      expect(created.ok).toBe(true);
    });
  });
});

describe("pallet set races", () => {
  it("maps a concurrent reference insert to the same conflict and keeps one row", async () => {
    await withFixture(async (fixture) => {
      const referenceNumber = nextNumber();
      const heldId = crypto.randomUUID();
      const result = await whileLocked(
        async (tx) => {
          await tx`
            insert into pallet_sets (
              id, kind, reference_number, grower_id, received_on, voided, created_by, updated_by, revision
            ) values (
              ${heldId}, 'A', ${referenceNumber}, ${fixture.growerId}, '2026-09-01', false,
              ${fixture.owner.userId}, ${fixture.owner.userId}, 1
            )
          `;
        },
        () =>
          createPalletSet(fixture.owner, {
            kind: "B",
            referenceNumber,
            growerId: fixture.growerId,
            receivedOn: "2026-09-02",
            pallets: [],
          }),
      );
      expect(result).toMatchObject({
        ok: false,
        code: "REFERENCE_NUMBER_TAKEN",
        referenceNumber,
      });
      const rows = await db
        .select({ id: palletSets.id })
        .from(palletSets)
        .where(eq(palletSets.referenceNumber, referenceNumber));
      expect(rows.map((row) => row.id)).toEqual([heldId]);
    });
  }, 20_000);

  it("rolls back a set when the pallet insert loses a unique race", async () => {
    await withFixture(async (fixture) => {
      const palletNumber = nextNumber();
      const failedReference = nextNumber();
      const heldSetId = crypto.randomUUID();
      const packageTare = 100;
      const palletTare = 500;
      const amount = 10;
      const gross = 20_000;
      const result = await whileLocked(
        async (tx) => {
          await tx`
            insert into pallet_sets (
              id, kind, reference_number, grower_id, received_on, voided, created_by, updated_by, revision
            ) values (
              ${heldSetId}, 'A', ${nextNumber()}, ${fixture.growerId}, '2026-09-03', false,
              ${fixture.owner.userId}, ${fixture.owner.userId}, 1
            )
          `;
          await tx`
            insert into pallets (
              id, set_id, grower_id, voided, pallet_number, yield_type_id, package_type_id, pallet_type_id,
              package_amount, gross_weight_grams, package_tare_grams, pallet_tare_grams, net_weight_grams
            ) values (
              ${crypto.randomUUID()}, ${heldSetId}, ${fixture.growerId}, false, ${palletNumber},
              ${fixture.yieldId}, ${fixture.packageId}, ${fixture.palletTypeId},
              ${amount}, ${gross}, ${packageTare}, ${palletTare},
              ${netWeightGrams(gross, packageTare, amount, palletTare)}
            )
          `;
        },
        () =>
          createPalletSet(fixture.owner, {
            kind: "A",
            referenceNumber: failedReference,
            growerId: fixture.growerId,
            receivedOn: "2026-09-04",
            pallets: [palletOf(fixture, { palletNumber, packageAmount: amount, grossWeightGrams: gross })],
          }),
      );
      expect(result).toMatchObject({ ok: false, code: "PALLET_NUMBER_TAKEN", palletNumbers: [palletNumber] });
      const failed = await db
        .select({ id: palletSets.id })
        .from(palletSets)
        .where(eq(palletSets.referenceNumber, failedReference));
      expect(failed).toEqual([]);
      const audits = await db
        .select({ summary: auditEvents.summary })
        .from(auditEvents)
        .where(eq(auditEvents.actorUserId, fixture.owner.userId));
      expect(
        audits.some((event) => {
          const summary = event.summary;
          return (
            typeof summary === "object" &&
            summary !== null &&
            "createdHeader" in summary &&
            summary.createdHeader !== null &&
            typeof summary.createdHeader === "object" &&
            "referenceNumber" in summary.createdHeader &&
            summary.createdHeader.referenceNumber === failedReference
          );
        }),
      ).toBe(false);
    });
  }, 20_000);

  it("rejects a request above 500 pallets before writing", async () => {
    await withFixture(async (fixture) => {
      const referenceNumber = nextNumber();
      const result = await createPalletSet(fixture.owner, {
        kind: "A",
        referenceNumber,
        growerId: fixture.growerId,
        receivedOn: "2026-09-05",
        pallets: Array.from({ length: 501 }, () => palletOf(fixture)),
      });
      expect(result).toMatchObject({ ok: false, code: "SET_TOO_LARGE" });
      const rows = await db
        .select({ id: palletSets.id })
        .from(palletSets)
        .where(eq(palletSets.referenceNumber, referenceNumber));
      expect(rows).toEqual([]);
    });
  });

  it("serializes two header saves of the same revision", async () => {
    await withFixture(async (fixture) => {
      const created = must(
        await createPalletSet(fixture.owner, {
          kind: "A",
          referenceNumber: nextNumber(),
          growerId: fixture.growerId,
          receivedOn: "2026-09-06",
          pallets: [palletOf(fixture)],
        }),
      );
      const [first, second] = await Promise.all([
        updatePalletSet(fixture.owner, { id: created.id, revision: 1, receivedOn: "2026-09-07" }),
        updatePalletSet(fixture.owner, { id: created.id, revision: 1, receivedOn: "2026-09-08" }),
      ]);
      const results = [first, second];
      expect(results.filter((result) => result.ok)).toHaveLength(1);
      expect(results.filter((result) => !result.ok && result.code === "SET_REVISION_CONFLICT")).toHaveLength(1);
      const detail = must(await getPalletSet(fixture.owner, created.id));
      expect(detail.revision).toBe(2);
      expect(["2026-09-07", "2026-09-08"]).toContain(detail.receivedOn);
      expect(detail.pallets).toHaveLength(1);
      const updates = await db
        .select({ id: auditEvents.id })
        .from(auditEvents)
        .where(eq(auditEvents.actorUserId, fixture.owner.userId));
      expect(updates.length).toBe(2);
    });
  });
});

async function whileLocked<T>(
  hold: (tx: postgres.TransactionSql) => Promise<void>,
  attempt: () => Promise<T>,
): Promise<T> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl || !isLocalDatabaseUrl(databaseUrl)) {
    throw new Error("Refusing to open a second connection: database host is not local.");
  }

  const sqlClient = postgres(databaseUrl, { max: 1 });
  let release = (): void => {};
  const released = new Promise<void>((resolve) => {
    release = resolve;
  });
  let markReady = (): void => {};
  const ready = new Promise<void>((resolve) => {
    markReady = resolve;
  });
  const held = sqlClient.begin(async (tx) => {
    await hold(tx);
    markReady();
    await released;
  });

  try {
    await ready;
    const pending = attempt();
    await waitForDatabaseLock();
    release();
    await held;
    return await pending;
  } finally {
    release();
    await held.catch(() => undefined);
    await sqlClient.end({ timeout: 5 });
  }
}

async function waitForDatabaseLock(): Promise<void> {
  const started = Date.now();
  while (Date.now() - started < 5_000) {
    const rows = await db
      .select({ waiting: sql<number>`count(*)::int` })
      .from(sql`pg_stat_activity`)
      .where(sql`wait_event_type = 'Lock' and pid <> pg_backend_pid()`);
    const waiting = rows[0]?.waiting ?? 0;
    if (waiting > 0) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 40));
  }
  throw new Error("timed out waiting for the conflicting write to block");
}
