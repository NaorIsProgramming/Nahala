import type { Metadata } from "next";
import type { ReactNode } from "react";

import { ReferenceAdminPage } from "@/features/reference-data/reference-admin-page";

export const metadata: Metadata = {
  title: "סוגי יבול",
};

export default function YieldTypesPage(): ReactNode {
  return <ReferenceAdminPage table="yield_types" />;
}
