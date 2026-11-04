import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { z } from "zod";

import { BackLink } from "@/components/ui/back-link";
import { canWriteReference, canWriteSet, getActor } from "@/lib/access";
import { getPalletSet } from "@/lib/services/pallet-sets";

import { loadEntryCatalog, withPalletTypes } from "./entry-catalog";
import { gridRowFromSaved } from "./grid-rows";
import { PalletEntryForm } from "./pallet-entry-form";
import { PalletSetMessage } from "./screen-message";

export async function EditPalletSetPage({
  id,
  createdField,
  createdId,
}: {
  id: string;
  createdField?: string;
  createdId?: string;
}): Promise<ReactNode> {
  const actor = await getActor();
  if (!actor) {
    redirect("/sign-in");
  }
  if (!z.uuid().safeParse(id).success) {
    return (
      <PalletSetMessage
        title="מיון ראשוני"
        message="הרשומה לא נמצאה"
        backHref="/app/pallet-sets"
        backLabel="מיון ראשוני"
      />
    );
  }

  const detail = await getPalletSet(actor, id);
  if (!detail.ok) {
    return (
      <PalletSetMessage
        title="מיון ראשוני"
        message={detail.message}
        backHref="/app/pallet-sets"
        backLabel="מיון ראשוני"
      />
    );
  }

  const set = detail.data;
  const backHref = `/app/pallet-sets/${set.id}`;
  if (set.voided) {
    return (
      <PalletSetMessage
        title="עריכת סט"
        message="הסט מבוטל, ואי אפשר לשנות את המשטחים."
        backHref={backHref}
        backLabel="הסט"
      />
    );
  }
  if (!canWriteSet(actor, set.growerId, set.kind)) {
    return (
      <PalletSetMessage
        title="אין הרשאה"
        message="החשבון הזה לא יכול לערוך את הסט."
        backHref={backHref}
        backLabel="הסט"
      />
    );
  }

  const loaded = await loadEntryCatalog(actor);
  if (loaded.status === "unavailable") {
    return (
      <PalletSetMessage
        title="עריכת סט"
        message={loaded.message}
        backHref={backHref}
        backLabel="הסט"
      />
    );
  }
  if (loaded.status === "no-growers") {
    return (
      <PalletSetMessage
        title="עריכת סט"
        message="כדי לערוך סט צריך מגדל פעיל."
        backHref={backHref}
        backLabel="הסט"
      />
    );
  }

  const catalog = withPalletTypes(loaded.catalog, set.pallets);
  const canAddRows =
    catalog.yieldTypes.length > 0 &&
    catalog.packageTypes.length > 0 &&
    catalog.palletTypes.length > 0;

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 pb-16">
      <BackLink href={backHref} label="הסט" />
      <h1 className="text-3xl font-semibold tracking-tight">
        עריכת אסמכתא{" "}
        <bdi dir="ltr" className="tabular-nums">
          {set.referenceNumber}
        </bdi>
      </h1>
      <p className="text-base leading-normal text-muted">
        אפשר להוסיף, לערוך ולהסיר כמה משטחים, ולשמור פעם אחת.
      </p>
      <PalletEntryForm
        mode="edit"
        setId={set.id}
        revision={set.revision}
        kind={set.kind}
        referenceNumber={set.referenceNumber}
        growerId={set.growerId}
        receivedOn={set.receivedOn}
        initialRows={set.pallets.map((pallet) => gridRowFromSaved(pallet))}
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
        createdField={createdField}
        createdId={createdId}
      />
    </main>
  );
}
