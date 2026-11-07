import "server-only";

import { and, desc, eq, sql, type SQL } from "drizzle-orm";

import { db } from "@/db";
import {
  AUDIT_ACTIONS,
  auditEvents,
  auditSubjects,
  growers,
  packageTypes,
  palletSets,
  palletTypes,
  pallets,
  yieldTypes,
  type AuditAction,
  type AuditSubjectType,
} from "@/db/schema";
import { canReadReference, scopeForSets, type Actor } from "@/lib/access";
import type { ReferenceTable } from "@/lib/access-types";
import { HISTORY_LIMIT } from "@/lib/audit/history-limit";

import { notFound, type PalletSetResult } from "./pallet-set-input";

export type SubjectHistoryEvent = {
  id: string;
  at: Date;
  action: AuditAction;
  summary: unknown;
};

export type SubjectHistory = {
  events: SubjectHistoryEvent[];
  truncated: boolean;
};

/**
 * Newest events for one subject. The filter is the leading columns of
 * `audit_subjects_subject_idx` (subject type, subject id, event id). The
 * summary is returned as stored and is not used in the WHERE clause.
 */
export async function listSubjectHistory(
  actor: Actor,
  subjectType: AuditSubjectType,
  subjectId: string,
): Promise<PalletSetResult<SubjectHistory>> {
  const visible = await subjectIsVisible(actor, subjectType, subjectId);
  if (!visible) {
    return notFound();
  }

  const rows = await db
    .select({
      id: auditEvents.id,
      at: auditEvents.at,
      action: auditEvents.action,
      summary: auditEvents.summary,
    })
    .from(auditSubjects)
    .innerJoin(auditEvents, eq(auditEvents.id, auditSubjects.eventId))
    .where(
      and(eq(auditSubjects.subjectType, subjectType), eq(auditSubjects.subjectId, subjectId)),
    )
    .orderBy(desc(auditEvents.at), desc(auditEvents.id))
    .limit(HISTORY_LIMIT + 1);

  const truncated = rows.length > HISTORY_LIMIT;
  const events: SubjectHistoryEvent[] = [];
  for (const row of rows.slice(0, HISTORY_LIMIT)) {
    if (!isAuditAction(row.action)) {
      continue;
    }
    events.push({
      id: row.id,
      at: row.at,
      action: row.action,
      summary: row.summary,
    });
  }

  return { ok: true, data: { events, truncated } };
}

async function subjectIsVisible(
  actor: Actor,
  subjectType: AuditSubjectType,
  subjectId: string,
): Promise<boolean> {
  switch (subjectType) {
    case "pallet_set":
      return setIsVisible(actor, subjectId);
    case "pallet":
      return palletIsVisible(actor, subjectId);
    case "grower":
      return referenceIsVisible(actor, "growers", subjectId);
    case "yield_type":
      return referenceIsVisible(actor, "yield_types", subjectId);
    case "package_type":
      return referenceIsVisible(actor, "package_types", subjectId);
    case "pallet_type":
      return referenceIsVisible(actor, "pallet_types", subjectId);
    default: {
      const exhaustive: never = subjectType;
      return exhaustive;
    }
  }
}

async function setIsVisible(actor: Actor, id: string): Promise<boolean> {
  const rows = await db
    .select({ id: palletSets.id })
    .from(palletSets)
    .where(and(eq(palletSets.id, id), setScope(actor)))
    .limit(1);
  return rows.length === 1;
}

async function palletIsVisible(actor: Actor, id: string): Promise<boolean> {
  const rows = await db
    .select({ id: pallets.id })
    .from(pallets)
    .innerJoin(palletSets, eq(pallets.setId, palletSets.id))
    .where(and(eq(pallets.id, id), setScope(actor)))
    .limit(1);
  return rows.length === 1;
}

async function referenceIsVisible(
  actor: Actor,
  table: ReferenceTable,
  id: string,
): Promise<boolean> {
  if (!canReadReference(actor, table)) {
    return false;
  }

  switch (table) {
    case "growers":
      return rowExists(growers, id);
    case "yield_types":
      return rowExists(yieldTypes, id);
    case "package_types":
      return rowExists(packageTypes, id);
    case "pallet_types":
      return rowExists(palletTypes, id);
    default: {
      const exhaustive: never = table;
      return exhaustive;
    }
  }
}

async function rowExists(
  table: typeof growers | typeof yieldTypes | typeof packageTypes | typeof palletTypes,
  id: string,
): Promise<boolean> {
  const rows = await db.select({ id: table.id }).from(table).where(eq(table.id, id)).limit(1);
  return rows.length === 1;
}

function setScope(actor: Actor): SQL {
  return scopeForSets(actor, {
    growerId: sql`${palletSets.growerId}`,
    kind: sql`${palletSets.kind}`,
  });
}

function isAuditAction(value: string): value is AuditAction {
  return AUDIT_ACTIONS.some((action) => action === value);
}
