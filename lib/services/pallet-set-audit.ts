import "server-only";

import { auditEvents, auditSubjects, type AuditAction, type AuditSubjectType } from "@/db/schema";

import type { DbTransaction } from "./db-transaction";

export type FieldChange<T> = { from: T; to: T };

export type PalletAuditSnapshot = {
  id: string;
  palletNumber: number;
  yieldTypeId: string;
  packageTypeId: string;
  palletTypeId: string;
  packageAmount: number;
  grossWeightGrams: number;
  packageTareGrams: number;
  palletTareGrams: number;
  netWeightGrams: number;
};

export type PalletFieldChanges = {
  palletNumber?: FieldChange<number>;
  yieldTypeId?: FieldChange<string>;
  packageTypeId?: FieldChange<string>;
  palletTypeId?: FieldChange<string>;
  packageAmount?: FieldChange<number>;
  grossWeightGrams?: FieldChange<number>;
  packageTareGrams?: FieldChange<number>;
  palletTareGrams?: FieldChange<number>;
  netWeightGrams?: FieldChange<number>;
};

export type PalletSetAuditSummary = {
  createdHeader?: {
    kind: string;
    referenceNumber: number;
    growerId: string;
    receivedOn: string;
  };
  header?: {
    kind?: FieldChange<string>;
    referenceNumber?: FieldChange<number>;
    growerId?: FieldChange<string>;
    receivedOn?: FieldChange<string>;
  };
  added?: PalletAuditSnapshot[];
  changed?: { id: string; fields: PalletFieldChanges }[];
  removed?: PalletAuditSnapshot[];
  voided?: FieldChange<boolean>;
  tareGrams?: FieldChange<number | null>;
};

export function palletChanges(
  before: PalletAuditSnapshot,
  after: PalletAuditSnapshot,
): PalletFieldChanges {
  const fields: PalletFieldChanges = {};
  if (before.palletNumber !== after.palletNumber) {
    fields.palletNumber = { from: before.palletNumber, to: after.palletNumber };
  }
  if (before.yieldTypeId !== after.yieldTypeId) {
    fields.yieldTypeId = { from: before.yieldTypeId, to: after.yieldTypeId };
  }
  if (before.packageTypeId !== after.packageTypeId) {
    fields.packageTypeId = { from: before.packageTypeId, to: after.packageTypeId };
  }
  if (before.palletTypeId !== after.palletTypeId) {
    fields.palletTypeId = { from: before.palletTypeId, to: after.palletTypeId };
  }
  if (before.packageAmount !== after.packageAmount) {
    fields.packageAmount = { from: before.packageAmount, to: after.packageAmount };
  }
  if (before.grossWeightGrams !== after.grossWeightGrams) {
    fields.grossWeightGrams = { from: before.grossWeightGrams, to: after.grossWeightGrams };
  }
  if (before.packageTareGrams !== after.packageTareGrams) {
    fields.packageTareGrams = { from: before.packageTareGrams, to: after.packageTareGrams };
  }
  if (before.palletTareGrams !== after.palletTareGrams) {
    fields.palletTareGrams = { from: before.palletTareGrams, to: after.palletTareGrams };
  }
  if (before.netWeightGrams !== after.netWeightGrams) {
    fields.netWeightGrams = { from: before.netWeightGrams, to: after.netWeightGrams };
  }
  return fields;
}

export async function writeAudit(
  tx: DbTransaction,
  input: {
    actorUserId: string;
    action: AuditAction;
    summary: PalletSetAuditSummary;
    subjects: { subjectType: AuditSubjectType; subjectId: string }[];
  },
): Promise<void> {
  const events = await tx
    .insert(auditEvents)
    .values({
      actorUserId: input.actorUserId,
      action: input.action,
      summary: input.summary,
    })
    .returning({ id: auditEvents.id });
  const event = events[0];
  if (!event) {
    throw new Error("audit insert returned no row");
  }
  if (input.subjects.length === 0) {
    return;
  }

  await tx.insert(auditSubjects).values(
    input.subjects.map((subject) => ({
      eventId: event.id,
      subjectType: subject.subjectType,
      subjectId: subject.subjectId,
    })),
  );
}
