import { Ban } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { z } from "zod";

import { BackLink } from "@/components/ui/back-link";
import { canWriteReference, canWriteSet, getActor } from "@/lib/access";
import type { Actor } from "@/lib/access-types";
import { PALLET_KIND_LABELS } from "@/lib/pallet-sets/kinds";
import { listActiveReference } from "@/lib/services/reference-data";
import { getPalletSet, listCommonNameIds, listSetGrowers } from "@/lib/services/pallet-sets";

import { AddPalletForm } from "./add-pallet-form";
import { formatFullDate } from "./dates";
import { PalletTable } from "./pallet-table";
import { PalletSetMessage } from "./screen-message";
import { ScrollToPallet } from "./scroll-to-pallet";
import { SetHeaderForm } from "./set-header-form";
import { VoidSetForm } from "./void-set-form";

export async function PalletSetDetailPage({
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
  const canChange = !set.voided && canWriteSet(actor, set.growerId, set.kind);
  const [formOptions, growers] = await Promise.all([
    canChange ? loadFormOptions(actor) : Promise.resolve(null),
    canChange ? listSetGrowers(actor) : Promise.resolve(null),
  ]);
  const backHref = set.voided ? "/app/pallet-sets/voided" : "/app/pallet-sets";
  const backLabel = set.voided ? "מבוטלים" : "מיון ראשוני";

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 pb-16">
      <ScrollToPallet />
      <BackLink href={backHref} label={backLabel} />
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">
          אסמכתא{" "}
          <bdi dir="ltr" className="tabular-nums">
            {set.referenceNumber}
          </bdi>
        </h1>
        {set.voided ? (
          <p className="inline-flex items-center gap-2 text-base font-medium text-foreground">
            <Ban aria-hidden="true" className="size-5" strokeWidth={2} />
            מבוטל
          </p>
        ) : null}
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {canChange && growers?.ok ? (
          <SetHeaderForm
            id={set.id}
            revision={set.revision}
            kind={set.kind}
            growerId={set.growerId}
            growers={growers.data}
            commonGrowerIds={formOptions?.status === "ready" ? formOptions.commonGrowerIds : []}
            receivedOn={set.receivedOn}
            canCreateGrower={canWriteReference(actor, "growers")}
            createdField={createdField}
            createdId={createdId}
          />
        ) : (
          <>
            <DetailItem label="סוג" value={PALLET_KIND_LABELS[set.kind]} />
            <DetailItem label="מגדל" value={set.growerName} />
            <DetailItem label="תאריך" value={formatFullDate(set.receivedOn)} />
          </>
        )}
      </div>
      <h2 className="text-xl font-semibold tracking-tight">משטחים</h2>
      <PalletTable
        pallets={set.pallets}
        setId={set.id}
        revision={set.revision}
        canRemove={canChange}
      />
      {canChange && formOptions?.status === "ready" ? (
        <AddPalletForm
          setId={set.id}
          revision={set.revision}
          yieldTypes={formOptions.yieldTypes}
          packageTypes={formOptions.packageTypes}
          palletTypes={formOptions.palletTypes}
          commonYieldIds={formOptions.commonYieldIds}
          commonPackageIds={formOptions.commonPackageIds}
          commonPalletTypeIds={formOptions.commonPalletTypeIds}
          canCreateYield={canWriteReference(actor, "yield_types")}
          canCreatePackage={canWriteReference(actor, "package_types")}
          canCreatePalletType={canWriteReference(actor, "pallet_types")}
          createdField={createdField}
          createdId={createdId}
        />
      ) : null}
      {canChange && formOptions?.status === "empty" ? (
        <p className="text-base leading-normal text-muted">
          כדי להוסיף משטח צריך סוג יבול, סוג אריזה וסוג משטח פעילים. אפשר להוסיף אותם במסך{" "}
          <Link
            href="/app/tables"
            className="font-medium text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            טבלאות
          </Link>
          .
        </p>
      ) : null}
      {canChange && formOptions?.status === "unavailable" ? (
        <p className="text-base leading-normal text-muted">לא ניתן לטעון את סוגי היבול, האריזה או המשטח.</p>
      ) : null}
      {canChange ? <VoidSetForm id={set.id} revision={set.revision} /> : null}
    </main>
  );
}

function DetailItem({ label, value }: { label: string; value: string }): ReactNode {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-base font-medium text-foreground">{label}</dt>
      <dd className="text-base leading-normal break-words text-foreground">{value}</dd>
    </div>
  );
}

type FormOptions =
  | {
      status: "ready";
      yieldTypes: { id: string; name: string }[];
      packageTypes: { id: string; name: string; recommendedPackageAmount: number | null }[];
      palletTypes: { id: string; name: string }[];
      commonYieldIds: string[];
      commonPackageIds: string[];
      commonPalletTypeIds: string[];
      commonGrowerIds: string[];
    }
  | { status: "empty" }
  | { status: "unavailable" };

async function loadFormOptions(actor: Actor): Promise<FormOptions> {
  const [yields, packages, palletTypes, commonNames] = await Promise.all([
    listActiveReference(actor, "yield_types"),
    listActiveReference(actor, "package_types"),
    listActiveReference(actor, "pallet_types"),
    listCommonNameIds(actor),
  ]);
  if (!yields.ok || !packages.ok || !palletTypes.ok) {
    return { status: "unavailable" };
  }
  if (yields.data.length === 0 || packages.data.length === 0 || palletTypes.data.length === 0) {
    return { status: "empty" };
  }
  return {
    status: "ready",
    yieldTypes: yields.data.map((row) => ({ id: row.id, name: row.name })),
    packageTypes: packages.data.map((row) => ({
      id: row.id,
      name: row.name,
      recommendedPackageAmount: row.recommendedPackageAmount,
    })),
    palletTypes: palletTypes.data.map((row) => ({ id: row.id, name: row.name })),
    commonYieldIds: commonNames.yieldTypes,
    commonPackageIds: commonNames.packageTypes,
    commonPalletTypeIds: commonNames.palletTypes,
    commonGrowerIds: commonNames.growers,
  };
}
