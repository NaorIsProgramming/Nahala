"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getActor } from "@/lib/access";
import {
  addPallets,
  createPalletSet,
  removePallets,
  voidPalletSet,
} from "@/lib/services/pallet-sets";
import {
  readAddPallets,
  readCreatePalletSet,
  readRemovePallets,
  readVoidPalletSet,
  type PalletSetResult,
} from "@/lib/services/pallet-set-input";

import { idlePalletSetActionState, type PalletSetActionState } from "./action-state";
import {
  readAddPalletForm,
  readCreateSetForm,
  readRemovePalletForm,
  readVoidSetForm,
} from "./form-values";

const SIGN_IN_MESSAGE = "יש להתחבר מחדש";
const SAVE_FAILED_MESSAGE = "לא הצלחנו לשמור. נסו שוב.";

function failureState(result: PalletSetResult<unknown>): PalletSetActionState {
  if (result.ok) {
    return idlePalletSetActionState;
  }
  return { status: "error", message: result.message };
}

function refreshSet(id: string): void {
  revalidatePath("/app/pallet-sets");
  revalidatePath("/app/pallet-sets/voided");
  revalidatePath(`/app/pallet-sets/${id}`);
}

export async function createPalletSetAction(
  _previous: PalletSetActionState,
  formData: FormData,
): Promise<PalletSetActionState> {
  const actor = await getActor();
  if (!actor) {
    return { status: "error", message: SIGN_IN_MESSAGE };
  }

  const read = readCreateSetForm(formData);
  if (!read.ok) {
    return { status: "error", message: read.message, field: read.field };
  }

  const parsed = readCreatePalletSet(read.value);
  if (!parsed.ok) {
    return failureState(parsed);
  }

  let created: Awaited<ReturnType<typeof createPalletSet>>;
  try {
    created = await createPalletSet(actor, parsed.data);
  } catch {
    console.error("pallet-set create action failed");
    return { status: "error", message: SAVE_FAILED_MESSAGE };
  }

  if (!created.ok) {
    return failureState(created);
  }

  revalidatePath("/app/pallet-sets");
  redirect(`/app/pallet-sets/${created.data.id}`);
}

export async function addPalletAction(
  _previous: PalletSetActionState,
  formData: FormData,
): Promise<PalletSetActionState> {
  const actor = await getActor();
  if (!actor) {
    return { status: "error", message: SIGN_IN_MESSAGE };
  }

  const read = readAddPalletForm(formData);
  if (!read.ok) {
    return { status: "error", message: read.message, field: read.field };
  }

  const parsed = readAddPallets(read.value);
  if (!parsed.ok) {
    return failureState(parsed);
  }

  try {
    const added = await addPallets(actor, parsed.data);
    if (!added.ok) {
      return failureState(added);
    }
    refreshSet(parsed.data.setId);
    return { status: "success", message: "המשטח נוסף" };
  } catch {
    console.error("pallet-set add action failed");
    return { status: "error", message: SAVE_FAILED_MESSAGE };
  }
}

export async function removePalletAction(
  _previous: PalletSetActionState,
  formData: FormData,
): Promise<PalletSetActionState> {
  const actor = await getActor();
  if (!actor) {
    return { status: "error", message: SIGN_IN_MESSAGE };
  }

  const read = readRemovePalletForm(formData);
  if (!read.ok) {
    return { status: "error", message: read.message };
  }

  const parsed = readRemovePallets(read.value);
  if (!parsed.ok) {
    return failureState(parsed);
  }

  try {
    const removed = await removePallets(actor, parsed.data);
    if (!removed.ok) {
      return failureState(removed);
    }
    refreshSet(parsed.data.setId);
    return { status: "success", message: "המשטח הוסר" };
  } catch {
    console.error("pallet-set remove action failed");
    return { status: "error", message: SAVE_FAILED_MESSAGE };
  }
}

export async function voidPalletSetAction(
  _previous: PalletSetActionState,
  formData: FormData,
): Promise<PalletSetActionState> {
  const actor = await getActor();
  if (!actor) {
    return { status: "error", message: SIGN_IN_MESSAGE };
  }

  const read = readVoidSetForm(formData);
  if (!read.ok) {
    return { status: "error", message: read.message };
  }

  const parsed = readVoidPalletSet(read.value);
  if (!parsed.ok) {
    return failureState(parsed);
  }

  try {
    const voided = await voidPalletSet(actor, parsed.data);
    if (!voided.ok) {
      return failureState(voided);
    }
    refreshSet(parsed.data.id);
    return { status: "success", message: "הסט בוטל" };
  } catch {
    console.error("pallet-set void action failed");
    return { status: "error", message: SAVE_FAILED_MESSAGE };
  }
}
