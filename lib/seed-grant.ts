import "server-only";

import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { accessGrants } from "@/db/schema";
import { isUniqueViolation, logPostgresFailure } from "@/lib/postgres-error";

/**
 * The local bootstrap user gets one global write grant.
 * A later run finds that row and does not insert another.
 */
export async function ensureGlobalWriteGrant(
  userId: string,
): Promise<"inserted" | "exists"> {
  const existing = await db
    .select({ id: accessGrants.id })
    .from(accessGrants)
    .where(
      and(
        eq(accessGrants.userId, userId),
        eq(accessGrants.scope, "global"),
        eq(accessGrants.access, "write"),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    return "exists";
  }

  try {
    await db.insert(accessGrants).values({
      userId,
      scope: "global",
      access: "write",
    });
  } catch (error: unknown) {
    if (isUniqueViolation(error)) {
      return "exists";
    }
    logPostgresFailure("seed grant failed", error);
    throw new Error("Could not store the global write grant.");
  }

  return "inserted";
}
