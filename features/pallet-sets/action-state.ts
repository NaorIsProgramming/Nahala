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
  | "grossWeightKilograms"
  | "revision";

export type PalletSetActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  field?: PalletSetActionField;
  /** Index of the submitted grid row, when the error belongs to one pallet. */
  rowIndex?: number;
  palletNumbers?: number[];
  /** Revision after a header save whose pallet save then failed. */
  revision?: number;
};

export const idlePalletSetActionState: PalletSetActionState = { status: "idle" };
