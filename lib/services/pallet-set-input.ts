import "server-only";

import { z } from "zod";

import { PALLET_KINDS, type PalletKind } from "@/lib/access-types";
import { RECOMMENDED_PACKAGE_AMOUNT_MAX } from "@/lib/reference-limits";

const MAX_PALLETS_PER_REQUEST = 500;
const GROSS_WEIGHT_MAX_GRAMS = 100_000_000;
const POSTGRES_INT_MAX = 2_147_483_647;

export type PalletSetCode =
  | "REFERENCE_NUMBER_TAKEN"
  | "PALLET_NUMBER_TAKEN"
  | "SET_REVISION_CONFLICT"
  | "NET_WEIGHT_NEGATIVE"
  | "PALLET_NUMBER_DUPLICATE"
  | "SET_TOO_LARGE"
  | "SET_VOIDED"
  | "INACTIVE_REFERENCE"
  | "NOT_FOUND"
  | "READ_ONLY"
  | "INVALID";

export type PalletSetFailure = {
  ok: false;
  code: PalletSetCode;
  message: string;
  referenceNumber?: number;
  palletNumbers?: number[];
  growerId?: string;
};

export type PalletSetResult<T> = { ok: true; data: T } | PalletSetFailure;

export type PalletClientInput = {
  palletNumber: number;
  yieldTypeId: string;
  packageTypeId: string;
  palletTypeId: string;
  packageAmount: number;
  grossWeightGrams: number;
};

export type PalletUpdateInput = {
  id: string;
  palletNumber?: number;
  yieldTypeId?: string;
  packageTypeId?: string;
  palletTypeId?: string;
  packageAmount?: number;
  grossWeightGrams?: number;
};

export type CreatePalletSetInput = {
  kind: PalletKind;
  referenceNumber: number;
  growerId: string;
  receivedOn: string;
  pallets: PalletClientInput[];
};

export type UpdatePalletSetInput = {
  id: string;
  revision: number;
  kind?: PalletKind;
  referenceNumber?: number;
  growerId?: string;
  receivedOn?: string;
};

export type ChangePalletsInput = {
  setId: string;
  revision: number;
  add: PalletClientInput[];
  update: PalletUpdateInput[];
  remove: string[];
};

export type AddPalletsInput = {
  setId: string;
  revision: number;
  pallets: PalletClientInput[];
};

export type UpdatePalletsInput = {
  setId: string;
  revision: number;
  pallets: PalletUpdateInput[];
};

export type RemovePalletsInput = {
  setId: string;
  revision: number;
  palletIds: string[];
};

export type VoidPalletSetInput = {
  id: string;
  revision: number;
};

export type ListPalletSetsInput = {
  kind?: PalletKind;
  growerId?: string;
  receivedFrom?: string;
  receivedTo?: string;
  referenceNumber?: number;
  limit?: number;
  offset?: number;
};

export type PalletSetSummary = {
  id: string;
  kind: PalletKind;
  referenceNumber: number;
  growerId: string;
  growerName: string;
  receivedOn: string;
  voided: boolean;
  revision: number;
};

export type PalletDetail = {
  id: string;
  palletNumber: number;
  yieldTypeId: string;
  yieldTypeName: string;
  packageTypeId: string;
  packageTypeName: string;
  palletTypeId: string;
  palletTypeName: string;
  packageAmount: number;
  grossWeightGrams: number;
  packageTareGrams: number;
  palletTareGrams: number;
  netWeightGrams: number;
};

export type PalletSetDetail = PalletSetSummary & {
  pallets: PalletDetail[];
};

export type PalletSetPage = {
  sets: PalletSetSummary[];
  limit: number;
  offset: number;
};

export type CreatedPalletSet = {
  id: string;
  revision: number;
  palletIds: string[];
};

export type SavedPalletSet = {
  id: string;
  revision: number;
};

export type ChangedPallets = {
  id: string;
  revision: number;
  addedPalletIds: string[];
};

export type SetGrowerOption = {
  id: string;
  name: string;
};

const NOT_FOUND_MESSAGE = "הרשומה לא נמצאה";
const READ_ONLY_MESSAGE = "אין הרשאה לבצע את הפעולה";
const INVALID_MESSAGE = "הבקשה אינה תקינה";

const positiveInt = z.number().int().min(1).max(POSTGRES_INT_MAX);
const revisionSchema = z.number().int().min(1).max(POSTGRES_INT_MAX);
const kindSchema = z.enum(PALLET_KINDS);

const calendarDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(isCalendarDate);

const palletSchema = z.strictObject({
  palletNumber: positiveInt,
  yieldTypeId: z.uuid(),
  packageTypeId: z.uuid(),
  palletTypeId: z.uuid(),
  packageAmount: z.number().int().min(1).max(RECOMMENDED_PACKAGE_AMOUNT_MAX),
  grossWeightGrams: z.number().int().min(0).max(GROSS_WEIGHT_MAX_GRAMS),
});

const palletUpdateSchema = z
  .strictObject({
    id: z.uuid(),
    palletNumber: positiveInt.optional(),
    yieldTypeId: z.uuid().optional(),
    packageTypeId: z.uuid().optional(),
    palletTypeId: z.uuid().optional(),
    packageAmount: z.number().int().min(1).max(RECOMMENDED_PACKAGE_AMOUNT_MAX).optional(),
    grossWeightGrams: z.number().int().min(0).max(GROSS_WEIGHT_MAX_GRAMS).optional(),
  })
  .refine(
    (value) =>
      value.palletNumber !== undefined ||
      value.yieldTypeId !== undefined ||
      value.packageTypeId !== undefined ||
      value.palletTypeId !== undefined ||
      value.packageAmount !== undefined ||
      value.grossWeightGrams !== undefined,
  );

const createSchema = z.strictObject({
  kind: kindSchema,
  referenceNumber: positiveInt,
  growerId: z.uuid(),
  receivedOn: calendarDate,
  pallets: z.array(palletSchema).max(MAX_PALLETS_PER_REQUEST).default([]),
});

const updateSchema = z
  .strictObject({
    id: z.uuid(),
    revision: revisionSchema,
    kind: kindSchema.optional(),
    referenceNumber: positiveInt.optional(),
    growerId: z.uuid().optional(),
    receivedOn: calendarDate.optional(),
  })
  .refine(
    (value) =>
      value.kind !== undefined ||
      value.referenceNumber !== undefined ||
      value.growerId !== undefined ||
      value.receivedOn !== undefined,
  );

const changeSchema = z.strictObject({
  setId: z.uuid(),
  revision: revisionSchema,
  add: z.array(palletSchema).max(MAX_PALLETS_PER_REQUEST).default([]),
  update: z.array(palletUpdateSchema).max(MAX_PALLETS_PER_REQUEST).default([]),
  remove: z.array(z.uuid()).max(MAX_PALLETS_PER_REQUEST).default([]),
});

const addSchema = z.strictObject({
  setId: z.uuid(),
  revision: revisionSchema,
  pallets: z.array(palletSchema).min(1).max(MAX_PALLETS_PER_REQUEST),
});

const updatePalletsSchema = z.strictObject({
  setId: z.uuid(),
  revision: revisionSchema,
  pallets: z.array(palletUpdateSchema).min(1).max(MAX_PALLETS_PER_REQUEST),
});

const removeSchema = z.strictObject({
  setId: z.uuid(),
  revision: revisionSchema,
  palletIds: z.array(z.uuid()).min(1).max(MAX_PALLETS_PER_REQUEST),
});

const listSchema = z.strictObject({
  kind: kindSchema.optional(),
  growerId: z.uuid().optional(),
  receivedFrom: calendarDate.optional(),
  receivedTo: calendarDate.optional(),
  referenceNumber: positiveInt.optional(),
  limit: z.number().int().min(1).max(100).optional(),
  offset: z.number().int().min(0).max(100_000).optional(),
});

export function notFound(): PalletSetFailure {
  return { ok: false, code: "NOT_FOUND", message: NOT_FOUND_MESSAGE };
}

export function readOnly(): PalletSetFailure {
  return { ok: false, code: "READ_ONLY", message: READ_ONLY_MESSAGE };
}

export function invalidRequest(): PalletSetFailure {
  return { ok: false, code: "INVALID", message: INVALID_MESSAGE };
}

export function referenceTaken(referenceNumber: number): PalletSetFailure {
  return {
    ok: false,
    code: "REFERENCE_NUMBER_TAKEN",
    message: "מספר האסמכתא כבר בשימוש",
    referenceNumber,
  };
}

export function palletNumbersTaken(growerId: string, palletNumbers: number[]): PalletSetFailure {
  return {
    ok: false,
    code: "PALLET_NUMBER_TAKEN",
    message: "מספר המשטח כבר בשימוש אצל המגדל",
    growerId,
    palletNumbers,
  };
}

export function palletNumbersDuplicate(palletNumbers: number[]): PalletSetFailure {
  return {
    ok: false,
    code: "PALLET_NUMBER_DUPLICATE",
    message: "אותו מספר משטח מופיע יותר מפעם אחת",
    palletNumbers,
  };
}

export function revisionConflict(): PalletSetFailure {
  return {
    ok: false,
    code: "SET_REVISION_CONFLICT",
    message: "הרשומה שונתה. רעננו ונסו שוב",
  };
}

export function netWeightNegative(): PalletSetFailure {
  return {
    ok: false,
    code: "NET_WEIGHT_NEGATIVE",
    message: "המשקל הנטו יצא שלילי",
  };
}

export function setTooLarge(): PalletSetFailure {
  return {
    ok: false,
    code: "SET_TOO_LARGE",
    message: "אפשר לשמור עד 500 משטחים בבת אחת",
  };
}

export function setVoided(): PalletSetFailure {
  return {
    ok: false,
    code: "SET_VOIDED",
    message: "הסט מבוטל, ואי אפשר לשנות את המשטחים",
  };
}

export function inactiveReference(): PalletSetFailure {
  return {
    ok: false,
    code: "INACTIVE_REFERENCE",
    message: "אחד מהערכים שנבחרו אינו פעיל",
  };
}

function isCalendarDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return false;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function fromZod(error: z.ZodError): PalletSetFailure {
  const palletArrayTooBig = error.issues.some((issue) => {
    if (issue.code !== "too_big") {
      return false;
    }
    return issue.path.some(
      (part) =>
        part === "pallets" ||
        part === "add" ||
        part === "update" ||
        part === "remove" ||
        part === "palletIds",
    );
  });
  if (palletArrayTooBig) {
    return setTooLarge();
  }
  return invalidRequest();
}

export function readCreatePalletSet(input: unknown): PalletSetResult<CreatePalletSetInput> {
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    return fromZod(parsed.error);
  }
  return { ok: true, data: parsed.data };
}

export function readUpdatePalletSet(input: unknown): PalletSetResult<UpdatePalletSetInput> {
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) {
    return fromZod(parsed.error);
  }
  return { ok: true, data: parsed.data };
}

export function readChangePallets(input: unknown): PalletSetResult<ChangePalletsInput> {
  const parsed = changeSchema.safeParse(input);
  if (!parsed.success) {
    return fromZod(parsed.error);
  }
  if (
    parsed.data.add.length + parsed.data.update.length + parsed.data.remove.length >
    MAX_PALLETS_PER_REQUEST
  ) {
    return setTooLarge();
  }
  if (
    parsed.data.add.length + parsed.data.update.length + parsed.data.remove.length ===
    0
  ) {
    return invalidRequest();
  }
  return { ok: true, data: parsed.data };
}

export function readAddPallets(input: unknown): PalletSetResult<AddPalletsInput> {
  const parsed = addSchema.safeParse(input);
  if (!parsed.success) {
    return fromZod(parsed.error);
  }
  return { ok: true, data: parsed.data };
}

export function readUpdatePallets(input: unknown): PalletSetResult<UpdatePalletsInput> {
  const parsed = updatePalletsSchema.safeParse(input);
  if (!parsed.success) {
    return fromZod(parsed.error);
  }
  return { ok: true, data: parsed.data };
}

export function readRemovePallets(input: unknown): PalletSetResult<RemovePalletsInput> {
  const parsed = removeSchema.safeParse(input);
  if (!parsed.success) {
    return fromZod(parsed.error);
  }
  return { ok: true, data: parsed.data };
}

export function readVoidPalletSet(input: unknown): PalletSetResult<VoidPalletSetInput> {
  const parsed = z.strictObject({ id: z.uuid(), revision: revisionSchema }).safeParse(input);
  if (!parsed.success) {
    return fromZod(parsed.error);
  }
  return { ok: true, data: parsed.data };
}

export function readListPalletSets(input: unknown): PalletSetResult<ListPalletSetsInput> {
  const parsed = listSchema.safeParse(input);
  if (!parsed.success) {
    return fromZod(parsed.error);
  }
  return { ok: true, data: parsed.data };
}
