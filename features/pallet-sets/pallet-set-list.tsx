import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { z } from "zod";

import { BackLink } from "@/components/ui/back-link";
import { canWriteReference, canWriteSet, getActor } from "@/lib/access";
import {
  getPalletSet,
  listCommonNameIds,
  listPalletSets,
  listSetGrowers,
  listVoidedPalletSets,
} from "@/lib/services/pallet-sets";

import { primaryButtonClassName, secondaryButtonClassName } from "./classes";
import { FormError } from "./form-error";
import {
  palletSetListPath,
  parsePalletSetListQuery,
  readListSearch,
  type RawSearchParams,
} from "./list-query";
import { PalletSetMessage } from "./screen-message";
import { SelectableSetTable } from "./selectable-set-table";
import { SetFilters } from "./set-filters";
import { SetGlance } from "./set-glance";
import { canReadSets, canWriteAnySet } from "./visibility";

export async function PalletSetListPage({
  voided,
  searchParams,
}: {
  voided: boolean;
  searchParams: RawSearchParams;
}): Promise<ReactNode> {
  const actor = await getActor();
  if (!actor) {
    redirect("/sign-in");
  }
  if (!canReadSets(actor)) {
    return (
      <PalletSetMessage
        title="אין הרשאה"
        message="החשבון הזה לא יכול לפתוח את המסך."
        backHref="/app"
        backLabel="נחלה"
      />
    );
  }

  const params = readListSearch(searchParams);
  const parsed = parsePalletSetListQuery(params);
  const selectedRaw = firstParam(searchParams.selected);
  const selectedId =
    selectedRaw !== undefined && z.uuid().safeParse(selectedRaw).success ? selectedRaw : undefined;
  const base = voided ? "/app/pallet-sets/voided" : "/app/pallet-sets";
  const [growersResult, listed, commonNames, selected] = await Promise.all([
    listSetGrowers(actor),
    parsed.ok
      ? voided
        ? listVoidedPalletSets(actor, parsed.input)
        : listPalletSets(actor, parsed.input)
      : Promise.resolve(null),
    listCommonNameIds(actor),
    selectedId === undefined ? Promise.resolve(null) : getPalletSet(actor, selectedId),
  ]);

  const title = voided ? "מבוטלים" : "מיון ראשוני";
  const growers = growersResult.ok ? growersResult.data : [];
  const sets = listed?.ok ? listed.data.sets : [];
  const hasNext = listed?.ok ? sets.length === listed.data.limit : false;
  const page = parsed.ok ? parsed.page : 1;
  const glance = selected?.ok ? selected.data : null;
  const filterPath = palletSetListPath(base, params, page);

  return (
    <main className="mx-auto flex h-full min-h-0 w-full max-w-6xl flex-1 flex-col gap-4 overflow-hidden px-4 pb-4">
      <div className="flex max-h-[40%] min-h-0 shrink-0 flex-col gap-4 overflow-y-auto">
      <BackLink href={voided ? "/app/pallet-sets" : "/app"} label={voided ? "מיון ראשוני" : "נחלה"} />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        <div className="flex flex-wrap gap-3">
          {!voided && canWriteAnySet(actor) ? (
            <Link href="/app/pallet-sets/new" className={primaryButtonClassName}>
              סט חדש
            </Link>
          ) : null}
          {voided ? null : (
            <Link href="/app/pallet-sets/voided" className={secondaryButtonClassName}>
              מבוטלים
            </Link>
          )}
        </div>
      </div>
      <SetFilters
        base={base}
        params={params}
        growers={growers}
        commonGrowerIds={commonNames.growers}
        canCreateGrower={canWriteReference(actor, "growers")}
      />
      {!parsed.ok ? <FormError id="list-error" message={parsed.message} /> : null}
      {parsed.ok && listed && !listed.ok ? (
        <FormError id="list-error" message={listed.message} />
      ) : null}
      {parsed.ok && listed?.ok && sets.length === 0 ? (
        <p className="text-base leading-normal text-muted">
          {page > 1 ? "אין סטים בעמוד זה." : voided ? "אין סטים מבוטלים." : "אין סטים פעילים."}
        </p>
      ) : null}
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="min-h-0 flex-1 basis-0 overflow-y-auto">
      {parsed.ok && listed?.ok && sets.length > 0 ? (
        <SelectableSetTable
          sets={sets}
          selectedId={selectedId}
          showVoided={voided}
          filterPath={filterPath}
        />
      ) : null}
      {parsed.ok && listed?.ok && (page > 1 || hasNext) ? (
        <nav aria-label="עמודים" className="mt-4 flex flex-wrap items-center gap-3">
          {page > 1 ? (
            <Link
              href={palletSetListPath(base, params, page - 1, selectedId)}
              className={secondaryButtonClassName}
            >
              העמוד הקודם
            </Link>
          ) : null}
          <p className="text-base text-foreground">
            עמוד{" "}
            <bdi dir="ltr" className="tabular-nums">
              {page}
            </bdi>
          </p>
          {hasNext ? (
            <Link
              href={palletSetListPath(base, params, page + 1, selectedId)}
              className={secondaryButtonClassName}
            >
              העמוד הבא
            </Link>
          ) : null}
        </nav>
      ) : null}
      </div>
      {glance ? (
        <div className="flex min-h-0 flex-1 basis-0 flex-col overflow-hidden">
        <SetGlance
          setId={glance.id}
          revision={glance.revision}
          referenceNumber={glance.referenceNumber}
          kind={glance.kind}
          growerName={glance.growerName}
          voided={glance.voided}
          canVoid={!glance.voided && canWriteSet(actor, glance.growerId, glance.kind)}
          pallets={glance.pallets}
        />
        </div>
      ) : null}
      </div>
    </main>
  );
}

function firstParam(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === undefined) {
    return undefined;
  }
  const trimmed = raw.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}
