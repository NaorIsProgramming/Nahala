import { isPalletKind } from "@/lib/access-types";
import { parseKilogramsToGrams } from "@/lib/kilograms";
import { parseRecommendedPackageAmount } from "@/lib/recommended-package-amount";
import { PALLET_GROSS_WEIGHT_MAX_GRAMS } from "@/lib/services/pallet-set-input";

import type { PalletSetActionField } from "./action-state";

const INVALID_MESSAGE = "הבקשה אינה תקינה";
const POSTGRES_INT_MAX = 2_147_483_647;

type FormFailure = { ok: false; message: string; field?: PalletSetActionField };

export type CreateSetFormValue = {
  kind: string;
  referenceNumber: number;
  growerId: string;
  receivedOn: string;
  pallets: [];
};

export type AddPalletFormValue = {
  setId: string;
  revision: number;
  pallets: [
    {
      palletNumber: number;
      yieldTypeId: string;
      packageTypeId: string;
      palletTypeId: string;
      packageAmount: number;
      grossWeightGrams: number;
    },
  ];
};

export type RemovePalletFormValue = {
  setId: string;
  revision: number;
  palletIds: [string];
};

export type VoidSetFormValue = {
  id: string;
  revision: number;
};

export function readCreateSetForm(
  formData: FormData,
): { ok: true; value: CreateSetFormValue } | FormFailure {
  const kind = readText(formData, "kind");
  if (!isPalletKind(kind)) {
    return { ok: false, message: "יש לבחור סוג", field: "kind" };
  }

  const referenceNumber = readWholeNumber(readText(formData, "referenceNumber"));
  if (referenceNumber === null || referenceNumber < 1 || referenceNumber > POSTGRES_INT_MAX) {
    return { ok: false, message: "מספר האסמכתא אינו תקין", field: "referenceNumber" };
  }

  const growerId = readText(formData, "growerId");
  if (growerId.length === 0) {
    return { ok: false, message: "יש לבחור מגדל", field: "growerId" };
  }

  const receivedOn = readText(formData, "receivedOn");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(receivedOn)) {
    return { ok: false, message: "התאריך אינו תקין", field: "receivedOn" };
  }

  return {
    ok: true,
    value: {
      kind,
      referenceNumber,
      growerId,
      receivedOn,
      pallets: [],
    },
  };
}

export function readAddPalletForm(
  formData: FormData,
): { ok: true; value: AddPalletFormValue } | FormFailure {
  const setId = readText(formData, "setId");
  const revision = readRevision(formData);
  if (setId.length === 0 || revision === null) {
    return { ok: false, message: INVALID_MESSAGE };
  }

  const palletNumber = readWholeNumber(readText(formData, "palletNumber"));
  if (palletNumber === null || palletNumber < 1 || palletNumber > POSTGRES_INT_MAX) {
    return { ok: false, message: "מספר המשטח אינו תקין", field: "palletNumber" };
  }

  const yieldTypeId = readText(formData, "yieldTypeId");
  if (yieldTypeId.length === 0) {
    return { ok: false, message: "יש לבחור סוג יבול", field: "yieldTypeId" };
  }

  const packageTypeId = readText(formData, "packageTypeId");
  if (packageTypeId.length === 0) {
    return { ok: false, message: "יש לבחור סוג אריזה", field: "packageTypeId" };
  }

  const palletTypeId = readText(formData, "palletTypeId");
  if (palletTypeId.length === 0) {
    return { ok: false, message: "יש לבחור סוג משטח", field: "palletTypeId" };
  }

  const packageAmount = parseRecommendedPackageAmount(readText(formData, "packageAmount"));
  if (packageAmount === null) {
    return { ok: false, message: "כמות האריזות אינה תקינה", field: "packageAmount" };
  }

  const grossWeightGrams = parseKilogramsToGrams(
    readText(formData, "grossWeightKilograms"),
    PALLET_GROSS_WEIGHT_MAX_GRAMS,
  );
  if (grossWeightGrams === null) {
    return { ok: false, message: "משקל הברוטו אינו תקין", field: "grossWeightKilograms" };
  }

  return {
    ok: true,
    value: {
      setId,
      revision,
      pallets: [
        {
          palletNumber,
          yieldTypeId,
          packageTypeId,
          palletTypeId,
          packageAmount,
          grossWeightGrams,
        },
      ],
    },
  };
}

export function readRemovePalletForm(
  formData: FormData,
): { ok: true; value: RemovePalletFormValue } | FormFailure {
  const setId = readText(formData, "setId");
  const palletId = readText(formData, "palletId");
  const revision = readRevision(formData);
  if (setId.length === 0 || palletId.length === 0 || revision === null) {
    return { ok: false, message: INVALID_MESSAGE };
  }
  return { ok: true, value: { setId, revision, palletIds: [palletId] } };
}

export function readVoidSetForm(
  formData: FormData,
): { ok: true; value: VoidSetFormValue } | FormFailure {
  const id = readText(formData, "id");
  const revision = readRevision(formData);
  if (id.length === 0 || revision === null) {
    return { ok: false, message: INVALID_MESSAGE };
  }
  return { ok: true, value: { id, revision } };
}

function readText(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function readWholeNumber(value: string): number | null {
  if (!/^\d+$/.test(value)) {
    return null;
  }
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function readRevision(formData: FormData): number | null {
  const parsed = readWholeNumber(readText(formData, "revision"));
  if (parsed === null || parsed < 1 || parsed > POSTGRES_INT_MAX) {
    return null;
  }
  return parsed;
}
