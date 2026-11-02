import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { BackLink } from "@/components/ui/back-link";
import { getActor } from "@/lib/access";
import { listSetGrowers } from "@/lib/services/pallet-sets";

import { todayInJerusalem } from "./dates";
import { NewSetForm } from "./new-set-form";
import { PalletSetMessage } from "./screen-message";
import { canWriteAnySet } from "./visibility";

export async function NewPalletSetPage(): Promise<ReactNode> {
  const actor = await getActor();
  if (!actor) {
    redirect("/sign-in");
  }
  if (!canWriteAnySet(actor)) {
    return (
      <PalletSetMessage
        title="אין הרשאה"
        message="החשבון הזה לא יכול ליצור סט."
        backHref="/app/pallet-sets"
        backLabel="מיון ראשוני"
      />
    );
  }

  const growers = await listSetGrowers(actor);
  if (!growers.ok) {
    return (
      <PalletSetMessage
        title="סט חדש"
        message={growers.message}
        backHref="/app/pallet-sets"
        backLabel="מיון ראשוני"
      />
    );
  }
  if (growers.data.length === 0) {
    return (
      <PalletSetMessage
        title="סט חדש"
        message="כדי ליצור סט צריך מגדל פעיל."
        backHref="/app/pallet-sets"
        backLabel="מיון ראשוני"
      />
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 pb-16">
      <BackLink href="/app/pallet-sets" label="מיון ראשוני" />
      <h1 className="text-3xl font-semibold tracking-tight">סט חדש</h1>
      <p className="text-base leading-normal text-muted">אפשר לשמור בלי משטחים, ולהוסיף משטח אחר כך.</p>
      <NewSetForm growers={growers.data} defaultDate={todayInJerusalem()} />
    </main>
  );
}
