import type { Metadata } from "next";
import type { ReactNode } from "react";

import { PalletSetDetailPage } from "@/features/pallet-sets/pallet-set-detail";

export const metadata: Metadata = {
  title: "מיון ראשוני",
};

type SearchParams = Record<string, string | string[] | undefined>;

export default async function PalletSetDetailRoute({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}): Promise<ReactNode> {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  return (
    <PalletSetDetailPage
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
