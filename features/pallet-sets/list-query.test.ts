import { describe, expect, it } from "vitest";

import { PALLET_SET_PAGE_SIZE, parsePalletSetListQuery, palletSetListPath } from "./list-query";

const GROWER_ID = "6ba7b810-9dad-41d1-80b4-00c04fd430c8";

describe("pallet set list query", () => {
  it("uses page size 50 and keeps filters in the path", () => {
    const params = {
      kind: "B",
      grower: GROWER_ID,
      from: "2026-11-01",
      to: "2026-11-30",
      reference: "12",
      page: "2",
    };
    const parsed = parsePalletSetListQuery(params);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }
    expect(parsed.page).toBe(2);
    expect(parsed.input).toEqual({
      limit: PALLET_SET_PAGE_SIZE,
      offset: 50,
      kind: "B",
      growerId: GROWER_ID,
      receivedFrom: "2026-11-01",
      receivedTo: "2026-11-30",
      referenceNumber: 12,
    });
    expect(palletSetListPath("/app/pallet-sets", params, 2)).toBe(
      `/app/pallet-sets?kind=B&grower=${GROWER_ID}&from=2026-11-01&to=2026-11-30&reference=12&page=2`,
    );
  });

  it("rejects a bad page, a zero reference, and an offset past the service cap", () => {
    expect(parsePalletSetListQuery({}).ok).toBe(true);
    expect(parsePalletSetListQuery({ page: "0" }).ok).toBe(false);
    expect(parsePalletSetListQuery({ reference: "0" }).ok).toBe(false);
    expect(parsePalletSetListQuery({ kind: "D" }).ok).toBe(false);
    expect(parsePalletSetListQuery({ page: "2002" }).ok).toBe(false);
    const last = parsePalletSetListQuery({ page: "2001" });
    expect(last.ok).toBe(true);
    if (last.ok) {
      expect(last.input.offset).toBe(100_000);
    }
  });
});
