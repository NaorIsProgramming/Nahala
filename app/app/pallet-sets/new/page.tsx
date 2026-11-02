import type { Metadata } from "next";
import type { ReactNode } from "react";

import { NewPalletSetPage } from "@/features/pallet-sets/new-pallet-set-page";

export const metadata: Metadata = {
  title: "סט חדש",
};

type SearchParams = Record<string, string | string[] | undefined>;

export default async function NewPalletSetRoute({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}): Promise<ReactNode> {
  const params = await searchParams;
  return (
    <NewPalletSetPage
      createdField={firstParam(params.createdField)}
      createdId={firstParam(params.createdId)}
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
