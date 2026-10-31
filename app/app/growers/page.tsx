import type { Metadata } from "next";
import type { ReactNode } from "react";

import { ReferenceAdminPage } from "@/features/reference-data/reference-admin-page";

export const metadata: Metadata = {
  title: "מגדלים",
};

export default function GrowersPage(): ReactNode {
  return <ReferenceAdminPage table="growers" />;
}
