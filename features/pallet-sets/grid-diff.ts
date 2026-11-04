export type GridPalletSnapshot = {
  id: string;
  palletNumber: number;
  yieldTypeId: string;
  packageTypeId: string;
  palletTypeId: string;
  packageAmount: number;
  grossWeightGrams: number;
};

export type SubmittedPallet = {
  id: string | null;
  palletNumber: number;
  yieldTypeId: string;
  packageTypeId: string;
  palletTypeId: string;
  packageAmount: number;
  grossWeightGrams: number;
};

export type PalletUpdatePatch = {
  id: string;
  palletNumber?: number;
  yieldTypeId?: string;
  packageTypeId?: string;
  palletTypeId?: string;
  packageAmount?: number;
  grossWeightGrams?: number;
};

export type PalletChangeLists = {
  setId: string;
  revision: number;
  add: Omit<SubmittedPallet, "id">[];
  update: PalletUpdatePatch[];
  remove: string[];
};

/**
 * One add / update / remove payload for the rows that differ from the loaded set.
 * New rows have no id, so the service mints the pallet UUID. An edited row keeps its id.
 * Returns null when the operator saved without changing the pallet list.
 */
export function buildPalletChange(
  setId: string,
  revision: number,
  original: GridPalletSnapshot[],
  submitted: SubmittedPallet[],
): PalletChangeLists | null {
  const byId = new Map(original.map((pallet) => [pallet.id, pallet]));
  const add: Omit<SubmittedPallet, "id">[] = [];
  const update: PalletUpdatePatch[] = [];
  const seen = new Set<string>();

  for (const row of submitted) {
    if (row.id === null) {
      add.push(palletFields(row));
      continue;
    }
    seen.add(row.id);
    const before = byId.get(row.id);
    if (before === undefined) {
      update.push({ id: row.id, ...palletFields(row) });
      continue;
    }
    const patch = changedPatch(before, row);
    if (patch !== null) {
      update.push(patch);
    }
  }

  const remove = original.filter((pallet) => !seen.has(pallet.id)).map((pallet) => pallet.id);
  if (add.length === 0 && update.length === 0 && remove.length === 0) {
    return null;
  }
  return { setId, revision, add, update, remove };
}

function palletFields(row: SubmittedPallet): Omit<SubmittedPallet, "id"> {
  return {
    palletNumber: row.palletNumber,
    yieldTypeId: row.yieldTypeId,
    packageTypeId: row.packageTypeId,
    palletTypeId: row.palletTypeId,
    packageAmount: row.packageAmount,
    grossWeightGrams: row.grossWeightGrams,
  };
}

function changedPatch(before: GridPalletSnapshot, row: SubmittedPallet): PalletUpdatePatch | null {
  const patch: PalletUpdatePatch = { id: before.id };
  let changed = false;
  if (row.palletNumber !== before.palletNumber) {
    patch.palletNumber = row.palletNumber;
    changed = true;
  }
  if (row.yieldTypeId !== before.yieldTypeId) {
    patch.yieldTypeId = row.yieldTypeId;
    changed = true;
  }
  if (row.packageTypeId !== before.packageTypeId) {
    patch.packageTypeId = row.packageTypeId;
    changed = true;
  }
  if (row.palletTypeId !== before.palletTypeId) {
    patch.palletTypeId = row.palletTypeId;
    changed = true;
  }
  if (row.packageAmount !== before.packageAmount) {
    patch.packageAmount = row.packageAmount;
    changed = true;
  }
  if (row.grossWeightGrams !== before.grossWeightGrams) {
    patch.grossWeightGrams = row.grossWeightGrams;
    changed = true;
  }
  return changed ? patch : null;
}
