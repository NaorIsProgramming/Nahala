import "server-only";

import { z } from "zod";

import type { ReferenceTable } from "@/lib/access-types";
import { parseKilogramsToGrams } from "@/lib/kilograms";
import { REFERENCE_NAME_MAX_LENGTH } from "@/lib/reference-limits";

export type ReferenceField = "name" | "tareKilograms" | "countsInGrowerInventory";

export type ReferenceRecord = {
  id: string;
  name: string;
  isActive: boolean;
  tareGrams: number | null;
  countsInGrowerInventory: boolean | null;
};

export type ReferenceFailure = {
  ok: false;
  code: "FORBIDDEN" | "NOT_FOUND" | "NAME_TAKEN" | "INVALID";
  message: string;
  field?: ReferenceField;
};

export type ReferenceResult<T> = { ok: true; data: T } | ReferenceFailure;

export type CreateReferenceInput =
  | { table: "growers" | "yield_types"; name: string }
  | { table: "pallet_types"; name: string; tareGrams: number }
  | {
      table: "package_types";
      name: string;
      tareGrams: number;
      countsInGrowerInventory: boolean;
    };

export type UpdateReferenceInput =
  | { table: "growers" | "yield_types"; id: string; name: string }
  | { table: "pallet_types"; id: string; name?: string; tareGrams?: number }
  | {
      table: "package_types";
      id: string;
      name?: string;
      tareGrams?: number;
      countsInGrowerInventory?: boolean;
    };

export type DeactivateReferenceInput = {
  table: ReferenceTable;
  id: string;
};

const NAME_TAKEN_MESSAGE = "השם כבר בשימוש";
const INVALID_TARE_MESSAGE =
  "הטרה צריכה להיות בין 0 ל-100 ק״ג, עם נקודה ועד שלוש ספרות אחריה";
const INVALID_REQUEST_MESSAGE = "הבקשה אינה תקינה";
const FORBIDDEN_MESSAGE = "אין הרשאה לבצע את הפעולה";
const NOT_FOUND_MESSAGE = "הרשומה לא נמצאה";

const nameSchema = z.string().trim().min(1).max(REFERENCE_NAME_MAX_LENGTH);
const tareKilogramsSchema = z.string().trim().min(1);
const idSchema = z.uuid();

const namedCreateSchema = z.strictObject({ name: nameSchema });
const namedUpdateSchema = z.strictObject({ id: idSchema, name: nameSchema });
const deactivateSchema = z.strictObject({ id: idSchema });

const palletCreateSchema = z.strictObject({
  name: nameSchema,
  tareKilograms: tareKilogramsSchema,
});

const palletUpdateSchema = z
  .strictObject({
    id: idSchema,
    name: nameSchema.optional(),
    tareKilograms: tareKilogramsSchema.optional(),
  })
  .refine((value) => value.name !== undefined || value.tareKilograms !== undefined);

const packageCreateSchema = z.strictObject({
  name: nameSchema,
  tareKilograms: tareKilogramsSchema,
  countsInGrowerInventory: z.boolean().default(true),
});

const packageUpdateSchema = z
  .strictObject({
    id: idSchema,
    name: nameSchema.optional(),
    tareKilograms: tareKilogramsSchema.optional(),
    countsInGrowerInventory: z.boolean().optional(),
  })
  .refine(
    (value) =>
      value.name !== undefined ||
      value.tareKilograms !== undefined ||
      value.countsInGrowerInventory !== undefined,
  );

function invalidNameMessage(): string {
  return `השם צריך להכיל בין תו אחד ל-${String(REFERENCE_NAME_MAX_LENGTH)} תווים`;
}

export function forbidden(): ReferenceFailure {
  return { ok: false, code: "FORBIDDEN", message: FORBIDDEN_MESSAGE };
}

export function notFound(): ReferenceFailure {
  return { ok: false, code: "NOT_FOUND", message: NOT_FOUND_MESSAGE };
}

export function nameTaken(): ReferenceFailure {
  return {
    ok: false,
    code: "NAME_TAKEN",
    message: NAME_TAKEN_MESSAGE,
    field: "name",
  };
}

export function invalidRequest(field?: ReferenceField): ReferenceFailure {
  if (field === "name") {
    return { ok: false, code: "INVALID", message: invalidNameMessage(), field };
  }
  if (field === "tareKilograms") {
    return { ok: false, code: "INVALID", message: INVALID_TARE_MESSAGE, field };
  }
  return { ok: false, code: "INVALID", message: INVALID_REQUEST_MESSAGE, field };
}

function invalidFromZod(error: z.ZodError): ReferenceFailure {
  const key = error.issues[0]?.path[0];
  if (key === "name" || key === "tareKilograms" || key === "countsInGrowerInventory") {
    return invalidRequest(key);
  }
  return invalidRequest();
}

function readTare(tareKilograms: string): ReferenceResult<number> {
  const grams = parseKilogramsToGrams(tareKilograms);
  if (grams === null) {
    return invalidRequest("tareKilograms");
  }
  return { ok: true, data: grams };
}

export function readCreateReference(
  table: ReferenceTable,
  input: unknown,
): ReferenceResult<CreateReferenceInput> {
  if (table === "growers" || table === "yield_types") {
    const parsed = namedCreateSchema.safeParse(input);
    if (!parsed.success) {
      return invalidFromZod(parsed.error);
    }
    return { ok: true, data: { table, name: parsed.data.name } };
  }

  if (table === "pallet_types") {
    const parsed = palletCreateSchema.safeParse(input);
    if (!parsed.success) {
      return invalidFromZod(parsed.error);
    }
    const tare = readTare(parsed.data.tareKilograms);
    if (!tare.ok) {
      return tare;
    }
    return { ok: true, data: { table, name: parsed.data.name, tareGrams: tare.data } };
  }

  const parsed = packageCreateSchema.safeParse(input);
  if (!parsed.success) {
    return invalidFromZod(parsed.error);
  }
  const tare = readTare(parsed.data.tareKilograms);
  if (!tare.ok) {
    return tare;
  }
  return {
    ok: true,
    data: {
      table,
      name: parsed.data.name,
      tareGrams: tare.data,
      countsInGrowerInventory: parsed.data.countsInGrowerInventory,
    },
  };
}

export function readUpdateReference(
  table: ReferenceTable,
  input: unknown,
): ReferenceResult<UpdateReferenceInput> {
  if (table === "growers" || table === "yield_types") {
    const parsed = namedUpdateSchema.safeParse(input);
    if (!parsed.success) {
      return invalidFromZod(parsed.error);
    }
    return { ok: true, data: { table, id: parsed.data.id, name: parsed.data.name } };
  }

  if (table === "pallet_types") {
    const parsed = palletUpdateSchema.safeParse(input);
    if (!parsed.success) {
      return invalidFromZod(parsed.error);
    }
    const tare =
      parsed.data.tareKilograms === undefined ? undefined : readTare(parsed.data.tareKilograms);
    if (tare && !tare.ok) {
      return tare;
    }
    return {
      ok: true,
      data: {
        table,
        id: parsed.data.id,
        ...(parsed.data.name === undefined ? {} : { name: parsed.data.name }),
        ...(tare === undefined ? {} : { tareGrams: tare.data }),
      },
    };
  }

  const parsed = packageUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return invalidFromZod(parsed.error);
  }
  const tare =
    parsed.data.tareKilograms === undefined ? undefined : readTare(parsed.data.tareKilograms);
  if (tare && !tare.ok) {
    return tare;
  }
  return {
    ok: true,
    data: {
      table,
      id: parsed.data.id,
      ...(parsed.data.name === undefined ? {} : { name: parsed.data.name }),
      ...(tare === undefined ? {} : { tareGrams: tare.data }),
      ...(parsed.data.countsInGrowerInventory === undefined
        ? {}
        : { countsInGrowerInventory: parsed.data.countsInGrowerInventory }),
    },
  };
}

export function readDeactivateReference(
  table: ReferenceTable,
  input: unknown,
): ReferenceResult<DeactivateReferenceInput> {
  const parsed = deactivateSchema.safeParse(input);
  if (!parsed.success) {
    return invalidFromZod(parsed.error);
  }
  return { ok: true, data: { table, id: parsed.data.id } };
}
