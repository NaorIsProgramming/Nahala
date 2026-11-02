import { Ban } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { z } from "zod";

import { BackLink } from "@/components/ui/back-link";
import { canWriteSet, getActor } from "@/lib/access";
import type { Actor } from "@/lib/access-types";
import { PALLET_KIND_LABELS } from "@/lib/pallet-sets/kinds";
import { listActiveReference } from "@/lib/services/reference-data";
import { getPalletSet } from "@/lib/services/pallet-sets";

import { AddPalletForm } from "./add-pallet-form";
import { formatFullDate } from "./dates";
import { PalletTable } from "./pallet-table";
import { PalletSetMessage } from "./screen-message";
import { VoidSetForm } from "./void-set-form";

export async function PalletSetDetailPage({ id }: { id: string }): Promise<ReactNode> {
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
  const formOptions = canChange ? await loadFormOptions(actor) : null;
  const backHref = set.voided ? "/app/pallet-sets/voided" : "/app/pallet-sets";
  const backLabel = set.voided ? "מבוטלים" : "מיון ראשוני";

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 pb-16">
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
      <dl className="grid gap-4 sm:grid-cols-3">
        <DetailItem label="סוג" value={PALLET_KIND_LABELS[set.kind]} />
        <DetailItem label="מגדל" value={set.growerName} />
        <div className="flex flex-col gap-1">
          <dt className="text-base font-medium text-foreground">תאריך</dt>
          <dd className="text-base leading-normal text-foreground">
            <bdi dir="ltr" className="tabular-nums">
              {formatFullDate(set.receivedOn)}
            </bdi>
          </dd>
        </div>
      </dl>
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
    }
  | { status: "empty" }
  | { status: "unavailable" };

async function loadFormOptions(actor: Actor): Promise<FormOptions> {
  const [yields, packages, palletTypes] = await Promise.all([
    listActiveReference(actor, "yield_types"),
    listActiveReference(actor, "package_types"),
    listActiveReference(actor, "pallet_types"),
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
  };
}
