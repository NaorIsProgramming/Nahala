import type { Metadata } from "next";
import type { ReactNode } from "react";

import { NewPalletSetPage } from "@/features/pallet-sets/new-pallet-set-page";

export const metadata: Metadata = {
  title: "סט חדש",
};

export default function NewPalletSetRoute(): ReactNode {
  return <NewPalletSetPage />;
}
