import type { Metadata } from "next";
import type { ReactNode } from "react";

import { EditPalletSetPage } from "@/features/pallet-sets/edit-pallet-set-page";

export const metadata: Metadata = {
  title: "עריכת סט",
};

type SearchParams = Record<string, string | string[] | undefined>;

export default async function EditPalletSetRoute({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}): Promise<ReactNode> {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  return (
    <EditPalletSetPage
      id={id}
      createdField={firstParam(query.createdField)}
      createdId={firstParam(query.createdId)}
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
