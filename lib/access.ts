import "server-only";

import { eq } from "drizzle-orm";
import { cache } from "react";

import { db } from "@/db";
import { accessGrants } from "@/db/schema";
import {
  isPalletKind,
  isReferenceTable,
  type Actor,
  type Grant,
  type GrantAccess,
  type ReferenceTable,
} from "@/lib/access-types";
import { getSession } from "@/lib/session";

export type { Actor, Grant, ReferenceTable } from "@/lib/access-types";

type GrantRow = {
  scope: string;
  access: string;
  growerId: string | null;
  kind: string | null;
  referenceTable: string | null;
};

function isGrantAccess(value: string): value is GrantAccess {
  return value === "read" || value === "write";
}

export function toGrant(row: GrantRow): Grant {
  if (
    row.scope === "global" &&
    isGrantAccess(row.access) &&
    row.growerId === null &&
    row.kind === null &&
    row.referenceTable === null
  ) {
    return { scope: "global", access: row.access };
  }

  if (
    row.scope === "palletSets" &&
    isGrantAccess(row.access) &&
    row.referenceTable === null &&
    (row.kind === null || isPalletKind(row.kind))
  ) {
    const kind = row.kind === null ? null : row.kind;
    return {
      scope: "palletSets",
      access: row.access,
      growerId: row.growerId,
      kind,
    };
  }

  if (
    row.scope === "reference" &&
    row.access === "write" &&
    row.growerId === null &&
    row.kind === null &&
    row.referenceTable !== null &&
    isReferenceTable(row.referenceTable)
  ) {
    return {
      scope: "reference",
      table: row.referenceTable,
      access: "write",
    };
  }

  throw new Error("Invalid access grant row");
}

export async function loadGrants(userId: string): Promise<Grant[]> {
  const rows = await db
    .select({
      scope: accessGrants.scope,
      access: accessGrants.access,
      growerId: accessGrants.growerId,
      kind: accessGrants.kind,
      referenceTable: accessGrants.referenceTable,
    })
    .from(accessGrants)
    .where(eq(accessGrants.userId, userId));

  return rows.map((row) => toGrant(row));
}

/** One session lookup and one grant query per request. */
export const getActor = cache(async (): Promise<Actor | null> => {
  const session = await getSession();
  if (!session) {
    return null;
  }

  return {
    userId: session.user.id,
    grants: await loadGrants(session.user.id),
  };
});

export function canReadReference(actor: Actor, table: ReferenceTable): boolean {
  return actor.grants.some((grant) => {
    if (grant.scope === "global") {
      return true;
    }
    return grant.scope === "reference" && grant.table === table;
  });
}

export function canWriteReference(actor: Actor, table: ReferenceTable): boolean {
  return actor.grants.some((grant) => {
    if (grant.scope === "global") {
      return grant.access === "write";
    }
    return grant.scope === "reference" && grant.table === table;
  });
}
