import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { BackLink } from "@/components/ui/back-link";
import { getActor } from "@/lib/access";
import { listPalletSets, listSetGrowers, listVoidedPalletSets } from "@/lib/services/pallet-sets";

import { primaryButtonClassName, secondaryButtonClassName } from "./classes";
import { FormError } from "./form-error";
import {
  palletSetListPath,
  parsePalletSetListQuery,
  readListSearch,
  type RawSearchParams,
} from "./list-query";
import { PalletSetMessage } from "./screen-message";
import { SetFilters } from "./set-filters";
import { SetTable } from "./set-table";
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
  const base = voided ? "/app/pallet-sets/voided" : "/app/pallet-sets";
  const [growersResult, listed] = await Promise.all([
    listSetGrowers(actor),
    parsed.ok
      ? voided
        ? listVoidedPalletSets(actor, parsed.input)
        : listPalletSets(actor, parsed.input)
      : Promise.resolve(null),
  ]);

  const title = voided ? "מבוטלים" : "מיון ראשוני";
  const growers = growersResult.ok ? growersResult.data : [];
  const sets = listed?.ok ? listed.data.sets : [];
  const hasNext = listed?.ok ? sets.length === listed.data.limit : false;
  const page = parsed.ok ? parsed.page : 1;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 pb-16">
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
      <SetFilters base={base} params={params} growers={growers} />
      {!parsed.ok ? <FormError id="list-error" message={parsed.message} /> : null}
      {parsed.ok && listed && !listed.ok ? (
        <FormError id="list-error" message={listed.message} />
      ) : null}
      {parsed.ok && listed?.ok && sets.length === 0 ? (
        <p className="text-base leading-normal text-muted">
          {page > 1 ? "אין סטים בעמוד זה." : voided ? "אין סטים מבוטלים." : "אין סטים פעילים."}
        </p>
      ) : null}
      {parsed.ok && listed?.ok && sets.length > 0 ? (
        <SetTable sets={sets} showVoided={voided} />
      ) : null}
      {parsed.ok && listed?.ok && (page > 1 || hasNext) ? (
        <nav aria-label="עמודים" className="flex flex-wrap items-center gap-3">
          {page > 1 ? (
            <Link href={palletSetListPath(base, params, page - 1)} className={secondaryButtonClassName}>
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
            <Link href={palletSetListPath(base, params, page + 1)} className={secondaryButtonClassName}>
              העמוד הבא
            </Link>
          ) : null}
        </nav>
      ) : null}
    </main>
  );
}
