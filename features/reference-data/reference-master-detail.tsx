"use client";

import { Search, X } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

import type { ReferenceActionState } from "./action-state";
import {
  CreateReferenceForm,
  ReferenceRowForm,
  type ReferenceRowValues,
} from "./reference-forms";

type ReferenceAction = (
  state: ReferenceActionState,
  formData: FormData,
) => Promise<ReferenceActionState>;

type Selection = "create" | string | null;

type ReferenceMasterDetailProps = {
  idPrefix: string;
  rows: ReferenceRowValues[];
  hasTare: boolean;
  tareRequired: boolean;
  hasInventory: boolean;
  hasPackageMeasures: boolean;
  createAction: ReferenceAction;
  updateAction: ReferenceAction;
  deactivateAction: ReferenceAction;
};

const rowButtonClassName =
  "flex min-h-11 w-full items-center gap-3 border-s-2 border-s-transparent px-3 py-2 text-start focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary";

export function ReferenceMasterDetail({
  idPrefix,
  rows,
  hasTare,
  tareRequired,
  hasInventory,
  hasPackageMeasures,
  createAction,
  updateAction,
  deactivateAction,
}: ReferenceMasterDetailProps): ReactNode {
  const filterId = useId();
  const panelRef = useRef<HTMLElement>(null);
  const skipPanelScroll = useRef(true);
  const [query, setQuery] = useState("");
  const [selection, setSelection] = useState<Selection>(null);
  const selectedRow =
    selection === null || selection === "create"
      ? undefined
      : rows.find((row) => row.id === selection);
  const visibleRows = rows.filter((row) => matchesQuery(row, query));

  useEffect(() => {
    if (skipPanelScroll.current) {
      skipPanelScroll.current = false;
      return;
    }
    panelRef.current?.scrollIntoView({ block: "nearest" });
  }, [selection]);

  return (
    <div className="grid items-start gap-4 md:grid-cols-2">
      <section
        aria-label="רשומות"
        className="overflow-hidden rounded-lg border border-border bg-surface"
      >
        <label htmlFor={filterId} className="flex min-h-11 items-center gap-2 border-b border-border px-3">
          <Search aria-hidden="true" className="size-5 shrink-0 text-muted" strokeWidth={2} />
          <span className="shrink-0 text-base font-medium text-foreground">סינון</span>
          <input
            id={filterId}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
            }}
            autoComplete="off"
            className="min-h-11 w-full min-w-0 bg-transparent text-base text-foreground focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary"
          />
        </label>
        <button
          type="button"
          aria-pressed={selection === "create"}
          onClick={() => {
            setSelection("create");
          }}
          className={cn(
            rowButtonClassName,
            "border-b border-border font-medium",
            selection === "create"
              ? "border-s-primary bg-background text-foreground"
              : "text-primary",
          )}
        >
          רשומה חדשה
        </button>
        {visibleRows.length === 0 ? (
          <p className="px-3 py-4 text-base leading-normal text-muted">
            {rows.length === 0 ? "אין רשומות עדיין." : "אין רשומות תואמות."}
          </p>
        ) : (
          <ul className="max-h-96 divide-y divide-border overflow-y-auto">
            {visibleRows.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  aria-pressed={row.id === selection}
                  onClick={() => {
                    setSelection(row.id);
                  }}
                  className={cn(
                    rowButtonClassName,
                    row.id === selection && "border-s-primary bg-background",
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        "block truncate text-base font-medium",
                        row.isActive ? "text-foreground" : "text-muted",
                      )}
                    >
                      {row.name}
                    </span>
                    <RowSummary
                      row={row}
                      hasTare={hasTare}
                      hasInventory={hasInventory}
                      hasPackageMeasures={hasPackageMeasures}
                    />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section
        ref={panelRef}
        aria-label={selection === "create" ? "רשומה חדשה" : "פרטי הרשומה"}
        className="flex min-h-80 flex-col gap-4 rounded-lg border border-border bg-surface p-4"
      >
        {selection === "create" ? (
          <>
            <PanelHeading title="רשומה חדשה" onClose={() => setSelection(null)} />
            <CreateReferenceForm
              key={rows.map((row) => row.id).join(",") || "empty"}
              idPrefix={`${idPrefix}-create`}
              action={createAction}
              hasTare={hasTare}
              tareRequired={tareRequired}
              hasInventory={hasInventory}
              hasPackageMeasures={hasPackageMeasures}
            />
          </>
        ) : selectedRow ? (
          <>
            <PanelHeading title={selectedRow.name} onClose={() => setSelection(null)} />
            <ReferenceRowForm
              key={rowKey(selectedRow)}
              row={selectedRow}
              action={updateAction}
              deactivateAction={deactivateAction}
              hasTare={hasTare}
              tareRequired={tareRequired}
              hasInventory={hasInventory}
              hasPackageMeasures={hasPackageMeasures}
            />
          </>
        ) : (
          <p className="m-auto text-center text-base leading-normal text-muted">
            בחרו רשומה כדי לראות פרטים ולערוך אותה.
          </p>
        )}
      </section>
    </div>
  );
}

function PanelHeading({
  title,
  onClose,
}: {
  title: string;
  onClose: () => void;
}): ReactNode {
  return (
    <div className="flex items-center gap-2">
      <h2 className="min-w-0 flex-1 truncate text-xl font-semibold tracking-tight">{title}</h2>
      <button
        type="button"
        aria-label="סגירה"
        onClick={onClose}
        className="inline-flex size-11 shrink-0 items-center justify-center rounded-md text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <X aria-hidden="true" className="size-5" strokeWidth={2} />
      </button>
    </div>
  );
}

function RowSummary({
  row,
  hasTare,
  hasInventory,
  hasPackageMeasures,
}: {
  row: ReferenceRowValues;
  hasTare: boolean;
  hasInventory: boolean;
  hasPackageMeasures: boolean;
}): ReactNode {
  return (
    <span className="block truncate text-base text-muted">
      {row.isActive ? "פעיל" : "לא פעיל"}
      {hasTare && row.tareKilograms !== null ? (
        <>
          {" · "}
          {hasPackageMeasures ? "טרה " : null}
          <bdi dir="ltr" className="tabular-nums">
            {row.tareKilograms}
          </bdi>
          {" ק״ג"}
        </>
      ) : null}
      {hasPackageMeasures && row.netWeightKilograms !== null ? (
        <>
          {" · "}
          נטו{" "}
          <bdi dir="ltr" className="tabular-nums">
            {row.netWeightKilograms}
          </bdi>
          {" ק״ג"}
        </>
      ) : null}
      {hasPackageMeasures && row.recommendedPackageAmount !== null ? (
        <>
          {" · "}
          <bdi dir="ltr" className="tabular-nums">
            {row.recommendedPackageAmount}
          </bdi>
          {" במשטח"}
        </>
      ) : null}
      {hasInventory ? (
        <>
          {" · "}
          {row.countsInGrowerInventory ? "נספר במלאי" : "לא נספר במלאי"}
        </>
      ) : null}
    </span>
  );
}

function matchesQuery(row: ReferenceRowValues, query: string): boolean {
  const needle = query.trim().toLocaleLowerCase("he");
  if (needle.length === 0) {
    return true;
  }
  const haystack = [
    row.name,
    row.tareKilograms ?? "",
    row.netWeightKilograms ?? "",
    row.recommendedPackageAmount ?? "",
  ]
    .join(" ")
    .toLocaleLowerCase("he");
  return haystack.includes(needle);
}

function rowKey(row: ReferenceRowValues): string {
  return [
    row.id,
    row.name,
    row.tareKilograms ?? "",
    row.netWeightKilograms ?? "",
    row.recommendedPackageAmount ?? "",
    String(row.countsInGrowerInventory),
    String(row.isActive),
  ].join(":");
}
