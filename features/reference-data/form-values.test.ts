import { describe, expect, it } from "vitest";

import type { ReferenceActionState } from "./action-state";
import { nextFieldValues, type ReferenceFormValues } from "./form-values";

const filled: ReferenceFormValues = {
  name: "ארגז תמרים",
  tareKilograms: "לא מספר",
  countsInGrowerInventory: true,
};

function error(field: ReferenceActionState["field"]): ReferenceActionState {
  return { status: "error", message: "שגיאה", field };
}

describe("nextFieldValues", () => {
  it("clears only the tare when the weight check fails", () => {
    expect(nextFieldValues(filled, error("tareKilograms"), false)).toEqual({
      name: "ארגז תמרים",
      tareKilograms: "",
      countsInGrowerInventory: true,
    });
  });

  it("clears only the name when the name check fails", () => {
    expect(nextFieldValues(filled, error("name"), false)).toEqual({
      ...filled,
      name: "",
    });
  });

  it("clears only the inventory flag when that check fails", () => {
    expect(nextFieldValues(filled, error("countsInGrowerInventory"), false)).toEqual({
      ...filled,
      countsInGrowerInventory: false,
    });
  });

  it("keeps every field when the error does not name one", () => {
    expect(nextFieldValues(filled, { status: "error", message: "שגיאה" }, false)).toBe(
      filled,
    );
  });

  it("empties a create form after a successful save", () => {
    expect(nextFieldValues(filled, { status: "success" }, true)).toEqual({
      name: "",
      tareKilograms: "",
      countsInGrowerInventory: true,
    });
  });

  it("keeps an edited row after a successful save", () => {
    expect(nextFieldValues(filled, { status: "success" }, false)).toBe(filled);
  });
});
