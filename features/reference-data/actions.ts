"use server";

import { revalidatePath } from "next/cache";

import { getActor } from "@/lib/access";
import type { ReferenceTable } from "@/lib/access-types";
import {
  createReference,
  deactivateReference,
  updateReference,
} from "@/lib/services/reference-data";
import {
  readCreateReference,
  readDeactivateReference,
  readUpdateReference,
  type ReferenceResult,
} from "@/lib/services/reference-input";

import {
  idleReferenceActionState,
  type ReferenceActionState,
} from "./action-state";
import { referenceTableMeta } from "./table-meta";

const SIGN_IN_MESSAGE = "יש להתחבר מחדש";
const SAVE_FAILED_MESSAGE = "לא הצלחנו לשמור. נסו שוב.";

function readText(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function toState(result: ReferenceResult<unknown>): ReferenceActionState {
  if (result.ok) {
    return { status: "success" };
  }
  return {
    status: "error",
    message: result.message,
    ...(result.field === undefined ? {} : { field: result.field }),
  };
}

export async function createReferenceAction(
  table: ReferenceTable,
  _previous: ReferenceActionState,
  formData: FormData,
): Promise<ReferenceActionState> {
  const actor = await getActor();
  if (!actor) {
    return { status: "error", message: SIGN_IN_MESSAGE };
  }

  const meta = referenceTableMeta[table];
  const raw: {
    name: string;
    tareKilograms?: string;
    countsInGrowerInventory?: boolean;
  } = { name: readText(formData, "name") };
  if (meta.hasTare) {
    raw.tareKilograms = readText(formData, "tareKilograms");
  }
  if (meta.hasInventory) {
    raw.countsInGrowerInventory = formData.get("countsInGrowerInventory") === "true";
  }

  try {
    const parsed = readCreateReference(table, raw);
    if (!parsed.ok) {
      return toState(parsed);
    }
    const created = await createReference(actor, parsed.data);
    if (!created.ok) {
      return toState(created);
    }
    revalidatePath(meta.href);
    return { status: "success" };
  } catch {
    console.error("reference-data create action failed");
    return { status: "error", message: SAVE_FAILED_MESSAGE };
  }
}

export async function updateReferenceAction(
  table: ReferenceTable,
  _previous: ReferenceActionState,
  formData: FormData,
): Promise<ReferenceActionState> {
  const actor = await getActor();
  if (!actor) {
    return { status: "error", message: SIGN_IN_MESSAGE };
  }

  const meta = referenceTableMeta[table];
  const raw: {
    id: string;
    name: string;
    tareKilograms?: string;
    countsInGrowerInventory?: boolean;
  } = {
    id: readText(formData, "id"),
    name: readText(formData, "name"),
  };
  if (meta.hasTare) {
    raw.tareKilograms = readText(formData, "tareKilograms");
  }
  if (meta.hasInventory) {
    raw.countsInGrowerInventory = formData.get("countsInGrowerInventory") === "true";
  }

  try {
    const parsed = readUpdateReference(table, raw);
    if (!parsed.ok) {
      return toState(parsed);
    }
    const updated = await updateReference(actor, parsed.data);
    if (!updated.ok) {
      return toState(updated);
    }
    revalidatePath(meta.href);
    return { status: "success" };
  } catch {
    console.error("reference-data update action failed");
    return { status: "error", message: SAVE_FAILED_MESSAGE };
  }
}

export async function deactivateReferenceAction(
  table: ReferenceTable,
  _previous: ReferenceActionState,
  formData: FormData,
): Promise<ReferenceActionState> {
  const actor = await getActor();
  if (!actor) {
    return { status: "error", message: SIGN_IN_MESSAGE };
  }

  try {
    const parsed = readDeactivateReference(table, { id: readText(formData, "id") });
    if (!parsed.ok) {
      return toState(parsed);
    }
    const deactivated = await deactivateReference(actor, parsed.data);
    if (!deactivated.ok) {
      return toState(deactivated);
    }
    revalidatePath(referenceTableMeta[table].href);
    return idleReferenceActionState;
  } catch {
    console.error("reference-data deactivate action failed");
    return { status: "error", message: SAVE_FAILED_MESSAGE };
  }
}
