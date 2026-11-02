import Link from "next/link";
import type { ReactNode } from "react";

import { PALLET_KINDS } from "@/lib/access-types";
import { PALLET_KIND_LABELS } from "@/lib/pallet-sets/kinds";

import { DateField } from "./date-field";

import { fieldClassName, primaryButtonClassName, secondaryButtonClassName } from "./classes";
import { FilterNameSearch } from "./name-search";
import { hasListFilters, palletSetListPath, type ListSearchParams } from "./list-query";

type GrowerChoice = { id: string; name: string };

export function SetFilters({
  base,
  params,
  growers,
  commonGrowerIds,
  canCreateGrower,
}: {
  base: "/app/pallet-sets" | "/app/pallet-sets/voided";
  params: ListSearchParams;
  growers: GrowerChoice[];
  commonGrowerIds: string[];
  canCreateGrower: boolean;
}): ReactNode {
  const kindOptions = PALLET_KINDS.map((kind) => ({
    id: kind,
    name: PALLET_KIND_LABELS[kind],
  }));
  return (
    <form method="get" className="grid gap-4 rounded-lg border border-border bg-surface p-4 sm:grid-cols-2 lg:grid-cols-3">
      <FilterNameSearch
        key={params.kind ?? "all-kinds"}
        id="filter-kind"
        name="kind"
        label="סוג"
        options={kindOptions}
        commonIds={[]}
        defaultId={params.kind ?? ""}
      />
      <FilterNameSearch
        key={params.grower ?? "all"}
        id="filter-grower"
        name="grower"
        label="מגדל"
        options={growers}
        commonIds={commonGrowerIds}
        defaultId={params.grower ?? ""}
        createHref={canCreateGrower ? "/app/growers" : undefined}
      />
      <div className="flex flex-col gap-2">
        <label htmlFor="filter-reference" className="text-base font-medium text-foreground">
          אסמכתא
        </label>
        <input
          id="filter-reference"
          name="reference"
          inputMode="numeric"
          autoComplete="off"
          dir="ltr"
          defaultValue={params.reference ?? ""}
          className={`${fieldClassName} tabular-nums`}
        />
      </div>
      <DateField id="filter-from" name="from" label="מתאריך" defaultIso={params.from ?? ""} />
      <DateField id="filter-to" name="to" label="עד תאריך" defaultIso={params.to ?? ""} />
      <div className="flex flex-wrap items-end gap-3">
        <button type="submit" className={primaryButtonClassName}>
          סינון
        </button>
        {hasListFilters(params) ? (
          <Link href={palletSetListPath(base, {}, 1)} className={secondaryButtonClassName}>
            ניקוי
          </Link>
        ) : null}
      </div>
    </form>
  );
}
