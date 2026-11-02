import {
  readListPalletSets,
  type ListPalletSetsInput,
} from "@/lib/services/pallet-set-input";

export const PALLET_SET_PAGE_SIZE = 50;

const INVALID_MESSAGE = "הבקשה אינה תקינה";

export type RawSearchParams = Record<string, string | string[] | undefined>;

export type ListSearchParams = {
  kind?: string;
  grower?: string;
  from?: string;
  to?: string;
  reference?: string;
  page?: string;
};

export type ParsedPalletSetList =
  | { ok: true; page: number; input: ListPalletSetsInput }
  | { ok: false; message: string };

export function readListSearch(params: RawSearchParams): ListSearchParams {
  return {
    kind: firstParam(params.kind),
    grower: firstParam(params.grower),
    from: firstParam(params.from),
    to: firstParam(params.to),
    reference: firstParam(params.reference),
    page: firstParam(params.page),
  };
}

export function parsePalletSetListQuery(params: ListSearchParams): ParsedPalletSetList {
  const raw: Record<string, unknown> = { limit: PALLET_SET_PAGE_SIZE };
  if (params.kind) {
    raw.kind = params.kind;
  }
  if (params.grower) {
    raw.growerId = params.grower;
  }
  if (params.from) {
    raw.receivedFrom = params.from;
  }
  if (params.to) {
    raw.receivedTo = params.to;
  }
  if (params.reference) {
    if (!/^\d+$/.test(params.reference)) {
      return { ok: false, message: INVALID_MESSAGE };
    }
    raw.referenceNumber = Number(params.reference);
  }

  let page = 1;
  if (params.page) {
    if (!/^[1-9]\d*$/.test(params.page)) {
      return { ok: false, message: INVALID_MESSAGE };
    }
    page = Number(params.page);
    if (!Number.isSafeInteger(page)) {
      return { ok: false, message: INVALID_MESSAGE };
    }
  }
  raw.offset = (page - 1) * PALLET_SET_PAGE_SIZE;

  const parsed = readListPalletSets(raw);
  if (!parsed.ok) {
    return { ok: false, message: parsed.message };
  }
  return { ok: true, page, input: parsed.data };
}

export function palletSetListPath(
  base: "/app/pallet-sets" | "/app/pallet-sets/voided",
  params: ListSearchParams,
  page: number,
): string {
  const search = new URLSearchParams();
  if (params.kind) {
    search.set("kind", params.kind);
  }
  if (params.grower) {
    search.set("grower", params.grower);
  }
  if (params.from) {
    search.set("from", params.from);
  }
  if (params.to) {
    search.set("to", params.to);
  }
  if (params.reference) {
    search.set("reference", params.reference);
  }
  if (page > 1) {
    search.set("page", String(page));
  }
  const query = search.toString();
  return query.length === 0 ? base : `${base}?${query}`;
}

export function hasListFilters(params: ListSearchParams): boolean {
  return (
    params.kind !== undefined ||
    params.grower !== undefined ||
    params.from !== undefined ||
    params.to !== undefined ||
    params.reference !== undefined
  );
}

function firstParam(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === undefined) {
    return undefined;
  }
  const trimmed = raw.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}
