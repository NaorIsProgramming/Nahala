import Link from "next/link";
import type { ReactNode } from "react";

import { PALLET_KINDS } from "@/lib/access-types";
import { PALLET_KIND_LABELS } from "@/lib/pallet-sets/kinds";

import { fieldClassName, primaryButtonClassName, secondaryButtonClassName } from "./classes";
import { hasListFilters, palletSetListPath, type ListSearchParams } from "./list-query";

type GrowerChoice = { id: string; name: string };

export function SetFilters({
  base,
  params,
  growers,
}: {
  base: "/app/pallet-sets" | "/app/pallet-sets/voided";
  params: ListSearchParams;
  growers: GrowerChoice[];
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
      <div className="flex flex-col gap-2">
        <label htmlFor="filter-grower" className="text-base font-medium text-foreground">
          מגדל
        </label>
        <select
          id="filter-grower"
          name="grower"
          defaultValue={params.grower ?? ""}
          className={fieldClassName}
        >
          <option value="">כל המגדלים</option>
          {growers.map((grower) => (
            <option key={grower.id} value={grower.id}>
              {grower.name}
            </option>
          ))}
        </select>
      </div>
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
