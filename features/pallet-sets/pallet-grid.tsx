"use client";

import Link from "next/link";
import { useEffect, useRef, type ReactNode } from "react";

import type { PalletSetActionField } from "./action-state";
import { secondaryButtonClassName } from "./classes";
import {
  emptyGridRow,
  GRID_ROW_COUNT,
  packageAmountForType,
  rowCopiedFrom,
  type GridRow,
  type PackageChoice,
  type PalletTypeChoice,
} from "./grid-rows";
import { PalletGridRow } from "./pallet-grid-row";

const COLUMN_COUNT = 6;

const headerClassName =
  "sticky top-0 z-10 border-b border-border bg-surface px-2 py-2 text-start text-base font-medium text-foreground";

type NamedChoice = { id: string; name: string };

export function PalletGrid({
  rows,
  onRowsChange,
  yieldTypes,
  packageTypes,
  palletTypes,
  commonYieldIds,
  commonPackageIds,
  commonPalletTypeIds,
  canAddRows,
  pending,
  errorId,
  negativeErrorId,
  errorField,
  errorRow,
  palletNumbers,
}: {
  rows: GridRow[];
  onRowsChange: (rows: GridRow[]) => void;
  yieldTypes: NamedChoice[];
  packageTypes: PackageChoice[];
  palletTypes: PalletTypeChoice[];
  commonYieldIds: string[];
  commonPackageIds: string[];
  commonPalletTypeIds: string[];
  canAddRows: boolean;
  pending: boolean;
  errorId: string;
  negativeErrorId: string;
  errorField?: PalletSetActionField;
  errorRow?: number;
  palletNumbers?: number[];
}): ReactNode {
  const focusRow = useRef<number | null>(null);
  useEffect(() => {
    if (focusRow.current === null) {
      return;
    }
    const index = focusRow.current;
    focusRow.current = null;
    focusCell(index, 0);
  }, [rows]);

  function move(row: number, column: number): void {
    if (column + 1 < COLUMN_COUNT) {
      focusCell(row, column + 1);
      return;
    }
    const nextRow = document.querySelector<HTMLElement>(`[data-grid-cell="${row + 1}-0"]`);
    if (nextRow) {
      nextRow.focus();
      return;
    }
    document.getElementById("pallet-grid-add")?.focus();
  }

  function addRow(): void {
    const previous = rows.at(-1);
    const next = previous ? rowCopiedFrom(previous, crypto.randomUUID()) : emptyGridRow(crypto.randomUUID());
    focusRow.current = rows.length;
    onRowsChange([...rows, next]);
  }

  return (
    <div className="flex flex-col gap-4">
      <input type="hidden" name={GRID_ROW_COUNT} value={rows.length} />
      {rows.length === 0 ? (
        <p className="text-base leading-normal text-muted">אין שורות בטבלה.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="w-full min-w-[72rem] border-collapse text-base">
            <thead>
              <tr>
                <th scope="col" className={headerClassName}>מספר</th>
                <th scope="col" className={headerClassName}>יבול</th>
                <th scope="col" className={headerClassName}>אריזה</th>
                <th scope="col" className={headerClassName}>סוג משטח</th>
                <th scope="col" className={headerClassName}>כמות</th>
                <th scope="col" className={headerClassName}>ברוטו (ק״ג)</th>
                <th scope="col" className={headerClassName}>נטו (ק״ג)</th>
                <th scope="col" className={headerClassName}>
                  <span className="sr-only">הסרה</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <PalletGridRow
                  key={row.key}
                  row={row}
                  index={index}
                  yieldTypes={yieldTypes}
                  packageTypes={packageTypes}
                  palletTypes={palletTypes}
                  commonYieldIds={commonYieldIds}
                  commonPackageIds={commonPackageIds}
                  commonPalletTypeIds={commonPalletTypeIds}
                  pending={pending}
                  errorId={errorId}
                  negativeErrorId={negativeErrorId}
                  errorField={errorField}
                  errorRow={errorRow}
                  palletNumbers={palletNumbers}
                  onMove={move}
                  onChange={(patch) => {
                    onRowsChange(
                      rows.map((current, rowIndex) =>
                        rowIndex === index ? { ...current, ...patch } : current,
                      ),
                    );
                  }}
                  onPackageChange={(packageTypeId) => {
                    const selected = packageTypes.find((item) => item.id === packageTypeId);
                    onRowsChange(
                      rows.map((current, rowIndex) =>
                        rowIndex === index
                          ? {
                              ...current,
                              packageTypeId,
                              packageAmount: packageAmountForType(
                                current.packageAmount,
                                selected?.recommendedPackageAmount ?? null,
                              ),
                            }
                          : current,
                      ),
                    );
                  }}
                  onRemove={() => {
                    onRowsChange(rows.filter((_, rowIndex) => rowIndex !== index));
                  }}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
      {canAddRows ? (
        <button
          id="pallet-grid-add"
          type="button"
          disabled={pending}
          onClick={addRow}
          className={secondaryButtonClassName}
        >
          הוספת שורה
        </button>
      ) : (
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
      )}
    </div>
  );
}

function focusCell(row: number, column: number): void {
  document.querySelector<HTMLElement>(`[data-grid-cell="${row}-${column}"]`)?.focus();
}
