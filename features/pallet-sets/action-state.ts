export type PalletSetActionField =
  | "kind"
  | "referenceNumber"
  | "growerId"
  | "receivedOn"
  | "palletNumber"
  | "yieldTypeId"
  | "packageTypeId"
  | "palletTypeId"
  | "packageAmount"
  | "grossWeightKilograms";

export type PalletSetActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  field?: PalletSetActionField;
};

export const idlePalletSetActionState: PalletSetActionState = { status: "idle" };
