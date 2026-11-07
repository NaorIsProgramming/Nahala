import { eq, inArray, sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import type { Actor } from "@/lib/access-types";
import { HISTORY_LIMIT } from "@/lib/audit/history-limit";
import { readAuditSummary } from "@/lib/audit/summary";
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
const { updateReference } = await import("@/lib/services/reference-data");
const { createPalletSet, removePallets } = await import("@/lib/services/pallet-sets");
const { listSubjectHistory } = await import("@/lib/services/audit");

const NOT_FOUND = { ok: false, code: "NOT_FOUND", message: "הרשומה לא נמצאה" };

let sequence = 200_000_000 + Math.floor(Math.random() * 700_000_000);

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
  const userId = await insertUser(ids);
  try {
    await run({
      ids,
      owner: { userId, grants: [{ scope: "global", access: "write" }] },
      growerId: await insertGrower(ids),
      otherGrowerId: await insertGrower(ids),
      yieldId: await insertNamed(ids, yieldTypes, "yieldIds"),
      packageId: await insertPackage(ids, 100),
      palletTypeId: await insertPalletType(ids, 500),
    });
  } finally {
    await cleanup(ids);
  }
}

async function insertUser(ids: CreatedIds): Promise<string> {
  const userId = crypto.randomUUID();
  await db.insert(user).values({
    id: userId,
    name: "היסטוריה",
    email: `${userId}@nahala.test`,
    emailVerified: false,
  });
  ids.userIds.push(userId);
  return userId;
}

async function insertGrower(ids: CreatedIds): Promise<string> {
  const rows = await db
    .insert(growers)
    .values({ name: `מגדל ${crypto.randomUUID()}` })
    .returning({ id: growers.id });
  const row = rows[0];
  if (!row) {
    throw new Error("grower insert failed");
  }
  ids.growerIds.push(row.id);
  return row.id;
}

async function insertNamed(
  ids: CreatedIds,
  table: typeof yieldTypes,
  key: "yieldIds",
): Promise<string> {
  const rows = await db
    .insert(table)
    .values({ name: `שם ${crypto.randomUUID()}` })
    .returning({ id: table.id });
  const row = rows[0];
  if (!row) {
    throw new Error("reference insert failed");
  }
  ids[key].push(row.id);
  return row.id;
}

async function insertPackage(ids: CreatedIds, tareGrams: number): Promise<string> {
  const rows = await db
    .insert(packageTypes)
    .values({ name: `אריזה ${crypto.randomUUID()}`, tareGrams })
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
    .values({ name: `משטח ${crypto.randomUUID()}`, tareGrams })
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
    await db.delete(user).where(inArray(user.id, ids.userIds));
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
}

function palletOf(fixture: Fixture, overrides: Partial<PalletClientInput> = {}): PalletClientInput {
  return {
    palletNumber: nextNumber(),
    yieldTypeId: fixture.yieldId,
    packageTypeId: fixture.packageId,
    palletTypeId: fixture.palletTypeId,
    packageAmount: 10,
    grossWeightGrams: 8_000,
    ...overrides,
  };
}

describe("subject history", () => {
  it("keeps a removed pallet's id and last weights on the set, then hides the pallet", async () => {
    await withFixture(async (fixture) => {
      const pallet = palletOf(fixture, { palletNumber: nextNumber() });
      const created = must(
        await createPalletSet(fixture.owner, {
          kind: "A",
          referenceNumber: nextNumber(),
          growerId: fixture.growerId,
          receivedOn: "2026-04-01",
          pallets: [pallet],
        }),
      );
      const palletId = created.palletIds[0];
      if (!palletId) {
        throw new Error("missing pallet");
      }

      const whileLive = must(
        await listSubjectHistory(fixture.owner, "pallet", palletId),
      );
      expect(whileLive.events.some((event) => event.action === "created")).toBe(true);

      must(
        await removePallets(fixture.owner, {
          setId: created.id,
          revision: created.revision,
          palletIds: [palletId],
        }),
      );

      const history = must(await listSubjectHistory(fixture.owner, "pallet_set", created.id));
      const removed = history.events
        .map((event) => readAuditSummary(event.summary)?.removed?.[0])
        .find((snapshot) => snapshot !== undefined);
      expect(removed).toMatchObject({
        id: palletId,
        palletNumber: pallet.palletNumber,
        grossWeightGrams: 8_000,
        packageTareGrams: 100,
        palletTareGrams: 500,
        netWeightGrams: netWeightGrams(8_000, 100, 10, 500),
      });
      expect(await listSubjectHistory(fixture.owner, "pallet", palletId)).toEqual(NOT_FOUND);
      const live = await db.select({ id: pallets.id }).from(pallets).where(eq(pallets.id, palletId));
      expect(live).toEqual([]);
    });
  });

  it("uses the same not-found result for a hidden set and a missing id", async () => {
    await withFixture(async (fixture) => {
      const created = must(
        await createPalletSet(fixture.owner, {
          kind: "A",
          referenceNumber: nextNumber(),
          growerId: fixture.growerId,
          receivedOn: "2026-04-02",
          pallets: [],
        }),
      );
      const outsider: Actor = {
        userId: fixture.owner.userId,
        grants: [
          {
            scope: "palletSets",
            access: "read",
            growerId: fixture.otherGrowerId,
            kind: null,
          },
        ],
      };
      const hidden = await listSubjectHistory(outsider, "pallet_set", created.id);
      const missing = await listSubjectHistory(outsider, "pallet_set", crypto.randomUUID());
      expect(hidden).toEqual(NOT_FOUND);
      expect(missing).toEqual(hidden);
      expect(hidden).not.toHaveProperty("data");

      const reader: Actor = {
        userId: fixture.owner.userId,
        grants: [{ scope: "global", access: "read" }],
      };
      const allowed = await listSubjectHistory(reader, "pallet_set", created.id);
      expect(allowed.ok).toBe(true);
    });
  });

  it("shows one tare event on the package type and none on its pallets", async () => {
    await withFixture(async (fixture) => {
      const created = must(
        await createPalletSet(fixture.owner, {
          kind: "A",
          referenceNumber: nextNumber(),
          growerId: fixture.growerId,
          receivedOn: "2026-04-03",
          pallets: [palletOf(fixture)],
        }),
      );
      const palletId = created.palletIds[0];
      if (!palletId) {
        throw new Error("missing pallet");
      }

      const updated = await updateReference(fixture.owner, {
        table: "package_types",
        id: fixture.packageId,
        tareGrams: 250,
      });
      expect(updated.ok).toBe(true);

      const packageHistory = must(
        await listSubjectHistory(fixture.owner, "package_type", fixture.packageId),
      );
      expect(packageHistory.events.map((event) => event.action)).toEqual(["tare_changed"]);
      expect(readAuditSummary(packageHistory.events[0]?.summary)?.tareGrams).toEqual({
        from: 100,
        to: 250,
      });

      const palletHistory = must(await listSubjectHistory(fixture.owner, "pallet", palletId));
      expect(palletHistory.events.some((event) => event.action === "tare_changed")).toBe(false);

      const packageGrant: Actor = {
        userId: fixture.owner.userId,
        grants: [{ scope: "reference", table: "package_types", access: "write" }],
      };
      expect(
        (await listSubjectHistory(packageGrant, "package_type", fixture.packageId)).ok,
      ).toBe(true);
      expect(await listSubjectHistory(packageGrant, "pallet", palletId)).toEqual(NOT_FOUND);
      expect(await listSubjectHistory(packageGrant, "grower", fixture.growerId)).toEqual(NOT_FOUND);
      expect(
        await listSubjectHistory(
          { userId: fixture.owner.userId, grants: [] },
          "package_type",
          fixture.packageId,
        ),
      ).toEqual(NOT_FOUND);
    });
  });

  it("returns the newest events up to the limit", async () => {
    await withFixture(async (fixture) => {
      const created = must(
        await createPalletSet(fixture.owner, {
          kind: "C",
          referenceNumber: nextNumber(),
          growerId: fixture.growerId,
          receivedOn: "2026-04-04",
          pallets: [],
        }),
      );
      const future = Date.UTC(2090, 0, 1);
      for (let index = 0; index < HISTORY_LIMIT; index += 1) {
        const inserted = await db
          .insert(auditEvents)
          .values({
            actorUserId: fixture.owner.userId,
            action: "updated",
            summary: { header: { referenceNumber: { from: index, to: index + 1 } } },
            at: new Date(future + index * 1000),
          })
          .returning({ id: auditEvents.id });
        const event = inserted[0];
        if (!event) {
          throw new Error("audit insert failed");
        }
        await db.insert(auditSubjects).values({
          eventId: event.id,
          subjectType: "pallet_set",
          subjectId: created.id,
        });
      }

      const history = must(await listSubjectHistory(fixture.owner, "pallet_set", created.id));
      expect(history.truncated).toBe(true);
      expect(history.events).toHaveLength(HISTORY_LIMIT);
      expect(readAuditSummary(history.events[0]?.summary)?.header?.referenceNumber?.to).toBe(
        HISTORY_LIMIT,
      );
    });
  });

  it("looks up the subject through the subject index", async () => {
    const subjectId = crypto.randomUUID();
    const plan = await db.transaction(async (tx) => {
      await tx.execute(sql`set local enable_seqscan = off`);
      return tx.execute(sql`
        explain
        select e.id
        from audit_subjects s
        inner join audit_events e on e.id = s.event_id
        where s.subject_type = 'pallet_set'
          and s.subject_id = cast(${subjectId} as uuid)
        order by e.at desc, e.id desc
        limit ${HISTORY_LIMIT + 1}
      `);
    });

    expect(JSON.stringify(plan)).toContain("audit_subjects_subject_idx");
  });
});
