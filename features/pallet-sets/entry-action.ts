"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getActor } from "@/lib/access";
import type { PalletKind } from "@/lib/access-types";
import { changePallets, getPalletSet, updatePalletSet } from "@/lib/services/pallet-sets";
import {
  readChangePallets,
  readUpdatePalletSet,
  revisionConflict,
  setVoided,
} from "@/lib/services/pallet-set-input";

import { palletSetActionFailure } from "./action-result";
import type { PalletSetActionState } from "./action-state";
import { buildPalletChange } from "./grid-diff";
import { readEditEntryForm } from "./form-values";

const SIGN_IN_MESSAGE = "יש להתחבר מחדש";
const SAVE_FAILED_MESSAGE = "לא הצלחנו לשמור. נסו שוב.";

export async function savePalletSetEntryAction(
  _previous: PalletSetActionState,
  formData: FormData,
): Promise<PalletSetActionState> {
  const actor = await getActor();
  if (!actor) {
    return { status: "error", message: SIGN_IN_MESSAGE };
  }

  const read = readEditEntryForm(formData);
  if (!read.ok) {
    return { status: "error", message: read.message, field: read.field, rowIndex: read.rowIndex };
  }

  const form = read.value;
  let current;
  try {
    current = await getPalletSet(actor, form.id);
  } catch {
    console.error("pallet-set entry load failed");
    return { status: "error", message: SAVE_FAILED_MESSAGE };
  }
  if (!current.ok) {
    return palletSetActionFailure(current);
  }
  if (current.data.voided) {
    return palletSetActionFailure(setVoided());
  }
  if (current.data.revision !== form.revision) {
    return palletSetActionFailure(revisionConflict());
  }

  const original = current.data.pallets.map((pallet) => ({
    id: pallet.id,
    palletNumber: pallet.palletNumber,
    yieldTypeId: pallet.yieldTypeId,
    packageTypeId: pallet.packageTypeId,
    palletTypeId: pallet.palletTypeId,
    packageAmount: pallet.packageAmount,
    grossWeightGrams: pallet.grossWeightGrams,
  }));
  const palletChange = buildPalletChange(form.id, form.revision, original, form.rows);
  const headerChanges = changedHeader(current.data, form);

  // The header is saved before the rows. A failed row save returns the new
  // revision, so the next submit retries the rows and does not write the header again.
  let revision = form.revision;
  if (headerChanges !== null) {
    const parsedHeader = readUpdatePalletSet({ id: form.id, revision, ...headerChanges });
    if (!parsedHeader.ok) {
      return palletSetActionFailure(parsedHeader);
    }
    try {
      const updated = await updatePalletSet(actor, parsedHeader.data);
      if (!updated.ok) {
        return palletSetActionFailure(updated);
      }
      revision = updated.data.revision;
    } catch {
      console.error("pallet-set entry header failed");
      return { status: "error", message: SAVE_FAILED_MESSAGE };
    }
  }

  if (palletChange !== null) {
    const parsedChange = readChangePallets({ ...palletChange, revision });
    if (!parsedChange.ok) {
      return {
        ...palletSetActionFailure(parsedChange),
        revision: headerChanges !== null ? revision : undefined,
      };
    }
    try {
      const changed = await changePallets(actor, parsedChange.data);
      if (!changed.ok) {
        return {
          ...palletSetActionFailure(changed),
          revision:
            headerChanges !== null && changed.code !== "SET_REVISION_CONFLICT"
              ? revision
              : undefined,
        };
      }
    } catch {
      console.error("pallet-set entry rows failed");
      return {
        status: "error",
        message: SAVE_FAILED_MESSAGE,
        revision: headerChanges !== null ? revision : undefined,
      };
    }
  }

  refreshSet(form.id);
  redirect(`/app/pallet-sets/${form.id}`);
}

function changedHeader(
  current: { kind: PalletKind; referenceNumber: number; growerId: string; receivedOn: string },
  form: { kind: PalletKind; referenceNumber: number; growerId: string; receivedOn: string },
): {
  kind?: PalletKind;
  referenceNumber?: number;
  growerId?: string;
  receivedOn?: string;
} | null {
  const changes: {
    kind?: PalletKind;
    referenceNumber?: number;
    growerId?: string;
    receivedOn?: string;
  } = {};
  if (form.kind !== current.kind) {
    changes.kind = form.kind;
  }
  if (form.referenceNumber !== current.referenceNumber) {
    changes.referenceNumber = form.referenceNumber;
  }
  if (form.growerId !== current.growerId) {
    changes.growerId = form.growerId;
  }
  if (form.receivedOn !== current.receivedOn) {
    changes.receivedOn = form.receivedOn;
  }
  return Object.keys(changes).length > 0 ? changes : null;
}

function refreshSet(id: string): void {
  revalidatePath("/app/pallet-sets");
  revalidatePath("/app/pallet-sets/voided");
  revalidatePath(`/app/pallet-sets/${id}`);
  revalidatePath(`/app/pallet-sets/${id}/edit`);
}
