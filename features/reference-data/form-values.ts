import type { ReferenceActionState } from "./action-state";

export type ReferenceFormValues = {
  name: string;
  tareKilograms: string;
  countsInGrowerInventory: boolean;
};

/**
 * React would otherwise reset every uncontrolled field after the action.
 * These values stay controlled, and only the field named by the failed check is emptied.
 */
export function nextFieldValues(
  current: ReferenceFormValues,
  state: ReferenceActionState,
  clearOnSuccess: boolean,
): ReferenceFormValues {
  if (state.status === "success") {
    if (!clearOnSuccess) {
      return current;
    }
    return { name: "", tareKilograms: "", countsInGrowerInventory: true };
  }

  if (state.status !== "error" || state.field === undefined) {
    return current;
  }

  if (state.field === "name") {
    return current.name === "" ? current : { ...current, name: "" };
  }
  if (state.field === "tareKilograms") {
    return current.tareKilograms === ""
      ? current
      : { ...current, tareKilograms: "" };
  }
  return current.countsInGrowerInventory
    ? { ...current, countsInGrowerInventory: false }
    : current;
}
