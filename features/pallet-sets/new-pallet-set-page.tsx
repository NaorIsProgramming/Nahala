import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { BackLink } from "@/components/ui/back-link";
import { canWriteReference, getActor } from "@/lib/access";

import { todayInJerusalem } from "./dates";
import { loadEntryCatalog } from "./entry-catalog";
import { PalletEntryForm } from "./pallet-entry-form";
import { PalletSetMessage } from "./screen-message";
import { canWriteAnySet } from "./visibility";

export async function NewPalletSetPage({
  createdField,
  createdId,
}: {
  createdField?: string;
  createdId?: string;
}): Promise<ReactNode> {
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

  const loaded = await loadEntryCatalog(actor);
  if (loaded.status === "unavailable") {
    return (
      <PalletSetMessage
        title="סט חדש"
        message={loaded.message}
        backHref="/app/pallet-sets"
        backLabel="מיון ראשוני"
      />
    );
  }
  if (loaded.status === "no-growers") {
    return (
      <PalletSetMessage
        title="סט חדש"
        message="כדי ליצור סט צריך מגדל פעיל."
        backHref="/app/pallet-sets"
        backLabel="מיון ראשוני"
      />
    );
  }

  const { catalog } = loaded;
  const canAddRows =
    catalog.yieldTypes.length > 0 &&
    catalog.packageTypes.length > 0 &&
    catalog.palletTypes.length > 0;

  return (
    <main className="mx-auto flex w-full max-w-[96rem] flex-1 flex-col gap-6 px-4 pb-16">
      <BackLink href="/app/pallet-sets" label="מיון ראשוני" />
      <h1 className="text-3xl font-semibold tracking-tight">סט חדש</h1>
      <p className="text-base leading-normal text-muted">
        אפשר לשמור בלי משטחים, או למלא שורות ולשמור פעם אחת.
      </p>
      <PalletEntryForm
        mode="create"
        growers={catalog.growers}
        commonGrowerIds={catalog.commonGrowerIds}
        canCreateGrower={canWriteReference(actor, "growers")}
        yieldTypes={catalog.yieldTypes}
        packageTypes={catalog.packageTypes}
        palletTypes={catalog.palletTypes}
        commonYieldIds={catalog.commonYieldIds}
        commonPackageIds={catalog.commonPackageIds}
        commonPalletTypeIds={catalog.commonPalletTypeIds}
        canAddRows={canAddRows}
        defaultDate={todayInJerusalem()}
        createdField={createdField}
        createdId={createdId}
      />
    </main>
  );
}
