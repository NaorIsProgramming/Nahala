import { describe, expect, it } from "vitest";

import type { Actor } from "@/lib/access-types";

import { canReadSets, canWriteAnySet } from "./visibility";

function actor(grants: Actor["grants"]): Actor {
  return { userId: "user", grants };
}

describe("pallet set visibility", () => {
  it("hides the list when the actor has no set grant", () => {
    expect(canReadSets(actor([]))).toBe(false);
    expect(
      canReadSets(
        actor([{ scope: "reference", table: "growers", access: "write" }]),
      ),
    ).toBe(false);
    expect(canWriteAnySet(actor([]))).toBe(false);
  });

  it("shows the list for a global or pallet-set grant, and the new link only for write", () => {
    const globalRead = actor([{ scope: "global", access: "read" }]);
    expect(canReadSets(globalRead)).toBe(true);
    expect(canWriteAnySet(globalRead)).toBe(false);

    const scopedRead = actor([
      { scope: "palletSets", access: "read", growerId: null, kind: "B" },
    ]);
    expect(canReadSets(scopedRead)).toBe(true);
    expect(canWriteAnySet(scopedRead)).toBe(false);

    const scopedWrite = actor([
      { scope: "palletSets", access: "write", growerId: "grower", kind: null },
    ]);
    expect(canReadSets(scopedWrite)).toBe(true);
    expect(canWriteAnySet(scopedWrite)).toBe(true);
  });
});
