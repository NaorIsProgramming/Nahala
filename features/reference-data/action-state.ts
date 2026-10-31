export type ReferenceActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  field?: "name" | "tareKilograms" | "countsInGrowerInventory";
};

export const idleReferenceActionState: ReferenceActionState = { status: "idle" };
