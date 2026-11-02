import "server-only";

import { eq, sql, type SQL } from "drizzle-orm";
import { cache } from "react";

import { db } from "@/db";
import { accessGrants } from "@/db/schema";
import {
  isPalletKind,
  isReferenceTable,
  type Actor,
  type Grant,
  type GrantAccess,
  type PalletKind,
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

/**
 * Rows the actor may see. Global grants match every set. Pallet-set grants
 * are a union: a null grower or kind means all of that field. Reference
 * grants match nothing here. No matching grant is `false` (default deny).
 */
export function scopeForSets(
  actor: Actor,
  columns: { growerId: SQL; kind: SQL },
): SQL {
  if (actor.grants.some((grant) => grant.scope === "global")) {
    return sql`true`;
  }

  const parts: SQL[] = [];
  for (const grant of actor.grants) {
    if (grant.scope !== "palletSets") {
      continue;
    }
    const growerMatch =
      grant.growerId === null
        ? sql`true`
        : sql`${columns.growerId} = ${grant.growerId}`;
    const kindMatch =
      grant.kind === null ? sql`true` : sql`${columns.kind} = ${grant.kind}`;
    parts.push(sql`(${growerMatch} and ${kindMatch})`);
  }

  if (parts.length === 0) {
    return sql`false`;
  }

  return sql`(${sql.join(parts, sql` or `)})`;
}

/** Write wins over read. A global write grant covers every grower and kind. */
export function canWriteSet(actor: Actor, growerId: string, kind: PalletKind): boolean {
  return actor.grants.some((grant) => {
    if (grant.scope === "global") {
      return grant.access === "write";
    }
    if (grant.scope !== "palletSets" || grant.access !== "write") {
      return false;
    }
    const growerMatches = grant.growerId === null || grant.growerId === growerId;
    const kindMatches = grant.kind === null || grant.kind === kind;
    return growerMatches && kindMatches;
  });
}
