import type { Metadata } from "next";
import type { ReactNode } from "react";

import { PalletSetListPage } from "@/features/pallet-sets/pallet-set-list";
import type { RawSearchParams } from "@/features/pallet-sets/list-query";

export const metadata: Metadata = {
  title: "מבוטלים",
};

export default async function VoidedPalletSetsPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}): Promise<ReactNode> {
  return <PalletSetListPage voided={true} searchParams={await searchParams} />;
}
