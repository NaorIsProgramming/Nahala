import type { Metadata } from "next";
import type { ReactNode } from "react";

import { ReferenceAdminPage } from "@/features/reference-data/reference-admin-page";

export const metadata: Metadata = {
  title: "סוגי משטח",
};

export default function PalletTypesPage(): ReactNode {
  return <ReferenceAdminPage table="pallet_types" />;
}
