import type { ReactNode } from "react";

import { BackLink } from "@/components/ui/back-link";

export function PalletSetMessage({
  title,
  message,
  backHref,
  backLabel,
}: {
  title: string;
  message: string;
  backHref: string;
  backLabel: string;
}): ReactNode {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-4 pb-16">
      <BackLink href={backHref} label={backLabel} />
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="text-base leading-normal text-muted">{message}</p>
    </main>
  );
}
