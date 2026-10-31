import { Leaf, Package, SquareStack, Users, type LucideIcon } from "lucide-react";

import type { ReferenceTable } from "@/lib/access-types";

export const referenceTableIcons = {
  growers: Users,
  yield_types: Leaf,
  package_types: Package,
  pallet_types: SquareStack,
} as const satisfies Record<ReferenceTable, LucideIcon>;
