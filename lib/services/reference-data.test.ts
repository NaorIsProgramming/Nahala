import { eq, inArray, sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { isLocalDatabaseUrl } from "@/lib/database-host";
import type { Actor, ReferenceTable } from "@/lib/access-types";
import type { ReferenceRecord, ReferenceResult } from "@/lib/services/reference-input";

if (!isLocalDatabaseUrl(process.env.DATABASE_URL ?? "")) {
  throw new Error(
    "Refusing to run tests: DATABASE_URL host must be localhost or 127.0.0.1.",
  );
}

const { db } = await import("@/db");
const { accessGrants, growers, packageTypes, palletTypes, user, yieldTypes } =
  await import("@/db/schema");
const { loadGrants } = await import("@/lib/access");
const { ensureGlobalWriteGrant } = await import("@/lib/seed-grant");
const {
  createReference,
  deactivateReference,
  listActiveReference,
  listReferenceAdmin,
  updateReference,
} = await import("@/lib/services/reference-data");
const { readCreateReference, readUpdateReference } = await import(
  "@/lib/services/reference-input"
);

type Created = { table: ReferenceTable; id: string };

const tables = {
  growers,
  yield_types: yieldTypes,
  package_types: packageTypes,
  pallet_types: palletTypes,
} as const;

function mustData<T>(result: ReferenceResult<T>): T {
  if (!result.ok) {
    throw new Error(result.code);
  }
  return result.data;
}

async function withUser(run: (userId: string, created: Created[]) => Promise<void>): Promise<void> {
  const userId = crypto.randomUUID();
  const created: Created[] = [];
  await db.insert(user).values({
    id: userId,
    name: "בדיקה",
    email: `${userId}@nahala.test`,
    emailVerified: false,
  });

  try {
    await run(userId, created);
  } finally {
    await db.delete(accessGrants).where(eq(accessGrants.userId, userId));
    for (const table of Object.keys(tables) as ReferenceTable[]) {
      const ids = created.filter((row) => row.table === table).map((row) => row.id);
      if (ids.length === 0) {
        continue;
      }
      const relation = tables[table];
      await db.delete(relation).where(inArray(relation.id, ids));
    }
    await db.delete(user).where(eq(user.id, userId));
  }
}

async function actorFor(userId: string): Promise<Actor> {
  return { userId, grants: await loadGrants(userId) };
}

function track(created: Created[], table: ReferenceTable, result: ReferenceResult<ReferenceRecord>): void {
  if (result.ok) {
    created.push({ table, id: result.data.id });
  }
}

describe("reference data access", () => {
  it("refuses every read and write when the user has no grants", async () => {
    await withUser(async (userId) => {
      const actor = await actorFor(userId);
      expect(actor.grants).toEqual([]);

      const listed = await listActiveReference(actor, "growers");
      const createdRow = await createReference(
        actor,
        mustData(readCreateReference("growers", { name: "מגדל ללא הרשאה" })),
      );

      expect(listed).toMatchObject({ ok: false, code: "FORBIDDEN" });
      expect(createdRow).toMatchObject({ ok: false, code: "FORBIDDEN" });
      if (!listed.ok) {
        expect("data" in listed).toBe(false);
      }
    });
  });

  it("lets a package-type grant edit that table only", async () => {
    await withUser(async (userId, created) => {
      await db.insert(accessGrants).values({
        userId,
        scope: "reference",
        access: "write",
        referenceTable: "package_types",
      });
      const actor = await actorFor(userId);

      const grower = await createReference(
        actor,
        mustData(readCreateReference("growers", { name: `מגדל ${userId}` })),
      );
      track(created, "growers", grower);
      expect(grower).toMatchObject({ ok: false, code: "FORBIDDEN" });

      const otherList = await listReferenceAdmin(actor, "growers");
      expect(otherList).toMatchObject({ ok: false, code: "FORBIDDEN" });

      const createdPackage = await createReference(
        actor,
        mustData(
          readCreateReference("package_types", {
            name: `אריזה ${userId}`,
            tareKilograms: "1.005",
          }),
        ),
      );
      track(created, "package_types", createdPackage);
      expect(createdPackage.ok).toBe(true);
      if (!createdPackage.ok) {
        return;
      }
      expect(createdPackage.data.tareGrams).toBe(1005);
      expect(createdPackage.data.countsInGrowerInventory).toBe(true);

      const updated = await updateReference(
        actor,
        mustData(
          readUpdateReference("package_types", {
            id: createdPackage.data.id,
            tareKilograms: "0.5",
            countsInGrowerInventory: false,
          }),
        ),
      );
      expect(updated.ok).toBe(true);
      if (!updated.ok) {
        return;
      }
      expect(updated.data.tareGrams).toBe(500);
      expect(updated.data.countsInGrowerInventory).toBe(false);
    });
  });

  it("gives a global write grant every reference change, and keeps inactive rows on the admin list", async () => {
    await withUser(async (userId, created) => {
      expect(await ensureGlobalWriteGrant(userId)).toBe("inserted");
      expect(await ensureGlobalWriteGrant(userId)).toBe("exists");
      const actor = await actorFor(userId);
      expect(actor.grants).toEqual([{ scope: "global", access: "write" }]);

      const name = `מגדל ${userId}`;
      const createdGrower = await createReference(
        actor,
        mustData(readCreateReference("growers", { name })),
      );
      track(created, "growers", createdGrower);
      const grower = mustData(createdGrower);

      const renamed = mustData(
        await updateReference(
          actor,
          mustData(readUpdateReference("growers", { id: grower.id, name: `חדש ${userId}` })),
        ),
      );
      expect(renamed.name).toBe(`חדש ${userId}`);

      const duplicate = await createReference(
        actor,
        mustData(readCreateReference("growers", { name: renamed.name })),
      );
      track(created, "growers", duplicate);
      expect(duplicate).toMatchObject({ ok: false, code: "NAME_TAKEN" });

      await deactivateReference(actor, { table: "growers", id: grower.id });
      const active = mustData(await listActiveReference(actor, "growers"));
      const admin = mustData(await listReferenceAdmin(actor, "growers"));
      expect(active.some((row) => row.id === grower.id)).toBe(false);
      expect(admin.some((row) => row.id === grower.id && row.isActive === false)).toBe(true);

      const reused = await createReference(
        actor,
        mustData(readCreateReference("growers", { name: renamed.name })),
      );
      track(created, "growers", reused);
      expect(reused.ok).toBe(true);
    });
  });

  it("lets a global read grant list rows and not write them", async () => {
    await withUser(async (userId) => {
      await db.insert(accessGrants).values({
        userId,
        scope: "global",
        access: "read",
      });
      const actor = await actorFor(userId);
      const listed = await listActiveReference(actor, "yield_types");
      const created = await createReference(
        actor,
        mustData(readCreateReference("yield_types", { name: `יבול ${userId}` })),
      );
      expect(listed.ok).toBe(true);
      expect(created).toMatchObject({ ok: false, code: "FORBIDDEN" });
    });
  });
});

describe("database role", () => {
  it("nahala_app cannot create tables", async () => {
    let created = false;
    try {
      await db.execute(sql`create table nahala_app_create_probe (id integer)`);
      created = true;
    } catch {
      created = false;
    }

    if (created) {
      await db.execute(sql`drop table nahala_app_create_probe`);
      throw new Error("nahala_app was able to CREATE a table");
    }
  });
});
