import type { Metadata } from "next";
import type { ReactNode } from "react";

import { PalletSetListPage } from "@/features/pallet-sets/pallet-set-list";
import type { RawSearchParams } from "@/features/pallet-sets/list-query";

export const metadata: Metadata = {
  title: "מיון ראשוני",
};

export default async function ActivePalletSetsPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}): Promise<ReactNode> {
  return <PalletSetListPage voided={false} searchParams={await searchParams} />;
}
