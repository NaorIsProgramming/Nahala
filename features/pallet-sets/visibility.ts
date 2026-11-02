import type { Actor } from "@/lib/access-types";

/** Global or pallet-set grants can open the list. A reference grant cannot. */
export function canReadSets(actor: Actor): boolean {
  return actor.grants.some(
    (grant) => grant.scope === "global" || grant.scope === "palletSets",
  );
}

/** A write grant somewhere is enough to show the new-set link. The service checks the row. */
export function canWriteAnySet(actor: Actor): boolean {
  return actor.grants.some((grant) => {
    if (grant.scope === "global") {
      return grant.access === "write";
    }
    return grant.scope === "palletSets" && grant.access === "write";
  });
}
