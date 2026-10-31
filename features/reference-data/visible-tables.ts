import "server-only";

import { canWriteReference, type Actor } from "@/lib/access";
import type { ReferenceTable } from "@/lib/access-types";

import { referenceTableOrder } from "./table-meta";

export function writableReferenceTables(actor: Actor): ReferenceTable[] {
  return referenceTableOrder.filter((table) => canWriteReference(actor, table));
}
