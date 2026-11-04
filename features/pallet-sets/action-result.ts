import type { PalletSetCode, PalletSetResult } from "@/lib/services/pallet-set-input";

import {
  idlePalletSetActionState,
  type PalletSetActionField,
  type PalletSetActionState,
} from "./action-state";

export function palletSetActionFailure(result: PalletSetResult<unknown>): PalletSetActionState {
  if (result.ok) {
    return idlePalletSetActionState;
  }
  return {
    status: "error",
    message: result.message,
    field: fieldForCode(result.code),
    palletNumbers: result.palletNumbers,
  };
}

function fieldForCode(code: PalletSetCode): PalletSetActionField | undefined {
  switch (code) {
    case "REFERENCE_NUMBER_TAKEN":
      return "referenceNumber";
    case "PALLET_NUMBER_TAKEN":
    case "PALLET_NUMBER_DUPLICATE":
      return "palletNumber";
    case "SET_REVISION_CONFLICT":
      return "revision";
    case "NET_WEIGHT_NEGATIVE":
      return "grossWeightKilograms";
    default:
      return undefined;
  }
}
