import type { Metadata } from "next";
import type { ReactNode } from "react";

import { ReferenceAdminPage } from "@/features/reference-data/reference-admin-page";

export const metadata: Metadata = {
  title: "מגדלים",
};

type SearchParams = Record<string, string | string[] | undefined>;

export default async function GrowersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}): Promise<ReactNode> {
  const params = await searchParams;
  return (
    <ReferenceAdminPage
      table="growers"
      returnTo={firstParam(params.returnTo)}
      prefillName={firstParam(params.prefill)}
      createdField={firstParam(params.createdField)}
    />
  );
}

function firstParam(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === undefined || raw.trim().length === 0) {
    return undefined;
  }
  return raw.trim();
}
