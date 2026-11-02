import type { Metadata } from "next";
import type { ReactNode } from "react";

import { PalletSetDetailPage } from "@/features/pallet-sets/pallet-set-detail";

export const metadata: Metadata = {
  title: "מיון ראשוני",
};

export default async function PalletSetDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<ReactNode> {
  const { id } = await params;
  return <PalletSetDetailPage id={id} />;
}
