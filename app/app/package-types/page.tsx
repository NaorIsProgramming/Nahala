import type { Metadata } from "next";
import type { ReactNode } from "react";

import { ReferenceAdminPage } from "@/features/reference-data/reference-admin-page";

export const metadata: Metadata = {
  title: "סוגי אריזה",
};

export default function PackageTypesPage(): ReactNode {
  return <ReferenceAdminPage table="package_types" />;
}
