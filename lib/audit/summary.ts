import { z } from "zod";

const stringChange = z.object({ from: z.string(), to: z.string() });
const numberChange = z.object({ from: z.number(), to: z.number() });
const nullableNumberChange = z.object({
  from: z.number().nullable(),
  to: z.number().nullable(),
});

const palletSnapshotSchema = z.object({
  id: z.string(),
  palletNumber: z.number(),
  yieldTypeId: z.string(),
  packageTypeId: z.string(),
  palletTypeId: z.string(),
  packageAmount: z.number(),
  grossWeightGrams: z.number(),
  packageTareGrams: z.number(),
  palletTareGrams: z.number(),
  netWeightGrams: z.number(),
});

const palletFieldChangesSchema = z.object({
  palletNumber: numberChange.optional(),
  yieldTypeId: stringChange.optional(),
  packageTypeId: stringChange.optional(),
  palletTypeId: stringChange.optional(),
  packageAmount: numberChange.optional(),
  grossWeightGrams: numberChange.optional(),
  packageTareGrams: numberChange.optional(),
  palletTareGrams: numberChange.optional(),
  netWeightGrams: numberChange.optional(),
});

const auditSummarySchema = z.object({
  createdHeader: z
    .object({
      kind: z.string(),
      referenceNumber: z.number(),
      growerId: z.string(),
      receivedOn: z.string(),
    })
    .optional(),
  header: z
    .object({
      kind: stringChange.optional(),
      referenceNumber: numberChange.optional(),
      growerId: stringChange.optional(),
      receivedOn: stringChange.optional(),
    })
    .optional(),
  added: z.array(palletSnapshotSchema).optional(),
  changed: z
    .array(
      z.object({
        id: z.string(),
        fields: palletFieldChangesSchema,
      }),
    )
    .optional(),
  removed: z.array(palletSnapshotSchema).optional(),
  voided: z.object({ from: z.boolean(), to: z.boolean() }).optional(),
  tareGrams: nullableNumberChange.optional(),
});

export type AuditSummary = z.infer<typeof auditSummarySchema>;
export type AuditPalletSnapshot = z.infer<typeof palletSnapshotSchema>;

/** Returns the summary when it matches the shape the writers store. */
export function readAuditSummary(value: unknown): AuditSummary | null {
  const parsed = auditSummarySchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
