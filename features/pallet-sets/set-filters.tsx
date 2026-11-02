import Link from "next/link";
import type { ReactNode } from "react";

import { PALLET_KINDS } from "@/lib/access-types";
import { PALLET_KIND_LABELS } from "@/lib/pallet-sets/kinds";

import { fieldClassName, primaryButtonClassName, secondaryButtonClassName } from "./classes";
import { FilterNameSearch } from "./name-search";
import { hasListFilters, palletSetListPath, type ListSearchParams } from "./list-query";

type GrowerChoice = { id: string; name: string };

export function SetFilters({
  base,
  params,
  growers,
  commonGrowerIds,
}: {
  base: "/app/pallet-sets" | "/app/pallet-sets/voided";
  params: ListSearchParams;
  growers: GrowerChoice[];
  commonGrowerIds: string[];
}): ReactNode {
  return (
    <form method="get" className="grid gap-4 rounded-lg border border-border bg-surface p-4 sm:grid-cols-2 lg:grid-cols-3">
      <div className="flex flex-col gap-2">
        <label htmlFor="filter-kind" className="text-base font-medium text-foreground">
          סוג
        </label>
        <select
          id="filter-kind"
          name="kind"
          defaultValue={params.kind ?? ""}
          className={fieldClassName}
        >
          <option value="">כל הסוגים</option>
          {PALLET_KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {PALLET_KIND_LABELS[kind]}
            </option>
          ))}
        </select>
      </div>
      <FilterNameSearch
        key={params.grower ?? "all"}
        id="filter-grower"
        name="grower"
        label="מגדל"
        options={growers}
        commonIds={commonGrowerIds}
        defaultId={params.grower ?? ""}
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
      <div className="flex flex-col gap-2">
        <label htmlFor="filter-from" className="text-base font-medium text-foreground">
          מתאריך
        </label>
        <input
          id="filter-from"
          name="from"
          type="date"
          dir="ltr"
          defaultValue={params.from ?? ""}
          className={`${fieldClassName} tabular-nums`}
        />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="filter-to" className="text-base font-medium text-foreground">
          עד תאריך
        </label>
        <input
          id="filter-to"
          name="to"
          type="date"
          dir="ltr"
          defaultValue={params.to ?? ""}
          className={`${fieldClassName} tabular-nums`}
        />
      </div>
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
