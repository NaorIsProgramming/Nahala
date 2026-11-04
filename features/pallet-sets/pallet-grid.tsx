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
  "sticky top-0 z-10 border-b border-input/40 bg-surface px-2 py-2 text-base font-medium text-foreground";
const textHeaderClassName = `${headerClassName} text-start`;
const numberHeaderClassName = `${headerClassName} text-center`;

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
        <div className="rounded-lg border border-border bg-surface">
          <table className="w-full table-fixed border-collapse text-base">
            <colgroup>
              <col className="w-28" />
              <col />
              <col />
              <col />
              <col className="w-20" />
              <col className="w-24" />
              <col className="w-20" />
              <col className="w-16" />
            </colgroup>
            <thead>
              <tr>
                <th scope="col" className={numberHeaderClassName}>מספר</th>
                <th scope="col" className={textHeaderClassName}>יבול</th>
                <th scope="col" className={textHeaderClassName}>אריזה</th>
                <th scope="col" className={textHeaderClassName}>סוג משטח</th>
                <th scope="col" className={numberHeaderClassName}>כמות</th>
                <th scope="col" className={numberHeaderClassName}>ברוטו (ק״ג)</th>
                <th scope="col" className={numberHeaderClassName}>נטו (ק״ג)</th>
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
