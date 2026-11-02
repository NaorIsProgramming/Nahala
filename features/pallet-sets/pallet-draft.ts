const DRAFT_KEY = "nahala-pallet-set-draft";

export type PalletDraft = {
  field: string;
  values: Record<string, string>;
};

export function savePalletDraft(draft: PalletDraft): void {
  sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

export function readPalletDraft(): PalletDraft | null {
  const raw = sessionStorage.getItem(DRAFT_KEY);
  if (raw === null) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isDraft(parsed)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearPalletDraft(): void {
  sessionStorage.removeItem(DRAFT_KEY);
}

function isDraft(value: unknown): value is PalletDraft {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const field = Reflect.get(value, "field");
  const values = Reflect.get(value, "values");
  if (typeof field !== "string" || typeof values !== "object" || values === null) {
    return false;
  }
  return Object.values(values).every((entry) => typeof entry === "string");
}
