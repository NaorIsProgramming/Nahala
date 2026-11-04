"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";

import type { PalletSetActionField } from "./action-state";
import {
  compactDangerButtonClassName,
  secondaryButtonClassName,
} from "./classes";
import {
  duplicateGridRow,
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
  "sticky top-0 z-10 border-b border-input/40 bg-surface px-2 py-1.5 text-base font-medium text-foreground";
const textHeaderClassName = `${headerClassName} border-s border-input/40 text-start`;
const numberHeaderClassName = `${headerClassName} border-s border-input/40 text-center`;

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
  const dragAnchor = useRef<number | null>(null);
  const selectionAnchor = useRef<number | null>(null);
  const keepSelection = useRef(false);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [selectedIndexes, setSelectedIndexes] = useState<number[] | null>(null);
  const [confirmingRemove, setConfirmingRemove] = useState(false);
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
    setSelectedIndexes(null);
    onRowsChange([...rows, next]);
  }

  function moveVertical(row: number, column: number, down: boolean, shift: boolean): void {
    const next = down ? row + 1 : row - 1;
    if (next < 0 || next >= rows.length) {
      return;
    }
    if (shift) {
      if (selectionAnchor.current === null) {
        selectionAnchor.current = row;
      }
      keepSelection.current = true;
      selectRange(selectionAnchor.current, next);
    } else {
      selectionAnchor.current = next;
      setSelectedIndexes(null);
      setConfirmingRemove(false);
      setFocusedIndex(next);
    }
    if (column < 0) {
      document.querySelector<HTMLElement>(`[data-row-gutter="${next}"]`)?.focus();
      return;
    }
    focusCell(next, column);
  }

  function moveHorizontal(row: number, column: number, left: boolean): void {
    if (column < 0) {
      if (left) {
        focusCell(row, 0);
      }
      return;
    }
    const next = left ? column + 1 : column - 1;
    if (next < 0) {
      document.querySelector<HTMLElement>(`[data-row-gutter="${row}"]`)?.focus();
      return;
    }
    if (next >= COLUMN_COUNT) {
      return;
    }
    focusCell(row, next);
  }

  function selectRange(anchor: number, index: number): void {
    setConfirmingRemove(false);
    const start = Math.min(anchor, index);
    const end = Math.max(anchor, index);
    const next: number[] = [];
    for (let cursor = start; cursor <= end; cursor += 1) {
      next.push(cursor);
    }
    setSelectedIndexes(next);
  }

  function handleRowPointerDown(index: number, event: ReactPointerEvent<HTMLButtonElement>): void {
    if (pending) {
      return;
    }
    event.preventDefault();
    event.currentTarget.focus();
    dragAnchor.current = index;
    selectionAnchor.current = index;
    setFocusedIndex(null);
    setConfirmingRemove(false);
    selectRange(index, index);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleRowPointerMove(event: ReactPointerEvent<HTMLButtonElement>): void {
    const anchor = dragAnchor.current;
    if (anchor === null) {
      return;
    }
    const hit = document.elementFromPoint(event.clientX, event.clientY);
    const marked = hit instanceof Element ? hit.closest<HTMLElement>("[data-pallet-row]") : null;
    const raw = marked?.dataset.palletRow;
    const index = raw === undefined ? Number.NaN : Number(raw);
    if (!Number.isInteger(index)) {
      return;
    }
    selectRange(anchor, index);
  }

  function handleRowPointerUp(): void {
    dragAnchor.current = null;
  }

  function handleFieldFocus(index: number): void {
    if (keepSelection.current) {
      keepSelection.current = false;
      setFocusedIndex(index);
      return;
    }
    setFocusedIndex(index);
    setSelectedIndexes(null);
    setConfirmingRemove(false);
    selectionAnchor.current = index;
  }

  function removeIndexes(indexes: number[]): void {
    const drop = new Set(indexes);
    setSelectedIndexes(null);
    setConfirmingRemove(false);
    setFocusedIndex(null);
    selectionAnchor.current = null;
    onRowsChange(rows.filter((_, index) => !drop.has(index)));
  }

  function removeSelected(fallbackIndex: number): void {
    const indexes = selectedIndexes ?? [fallbackIndex];
    if (indexes.length > 1) {
      setConfirmingRemove(true);
      return;
    }
    removeIndexes(indexes);
  }

  function copyOneSelected(): void {
    if (selectedIndexes === null || selectedIndexes.length === 0) {
      return;
    }
    const anchor = selectionAnchor.current;
    const sourceIndex =
      anchor !== null && selectedIndexes.includes(anchor) ? anchor : selectedIndexes[0];
    const source = sourceIndex === undefined ? undefined : rows[sourceIndex];
    if (source === undefined || sourceIndex === undefined) {
      return;
    }
    const next = [...rows];
    next.splice(sourceIndex + 1, 0, duplicateGridRow(source, crypto.randomUUID()));
    setSelectedIndexes(null);
    setConfirmingRemove(false);
    setFocusedIndex(sourceIndex + 1);
    focusRow.current = sourceIndex + 1;
    onRowsChange(next);
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
              <col className="w-10" />
              <col className="w-28" />
              <col />
              <col />
              <col />
              <col className="w-20" />
              <col className="w-24" />
              <col className="w-20" />
            </colgroup>
            <thead>
              <tr>
                <th scope="col" className={headerClassName}>
                  <span className="sr-only">שורה</span>
                </th>
                <th scope="col" className={numberHeaderClassName}>מספר</th>
                <th scope="col" className={textHeaderClassName}>יבול</th>
                <th scope="col" className={textHeaderClassName}>אריזה</th>
                <th scope="col" className={textHeaderClassName}>סוג משטח</th>
                <th scope="col" className={numberHeaderClassName}>כמות</th>
                <th scope="col" className={numberHeaderClassName}>ברוטו (ק״ג)</th>
                <th scope="col" className={numberHeaderClassName}>נטו (ק״ג)</th>
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
                  highlighted={
                    selectedIndexes !== null
                      ? selectedIndexes.includes(index)
                      : focusedIndex === index
                  }
                  onFieldFocus={() => {
                    handleFieldFocus(index);
                  }}
                  onRowPointerDown={(event) => {
                    handleRowPointerDown(index, event);
                  }}
                  onRowPointerMove={handleRowPointerMove}
                  onRowPointerUp={handleRowPointerUp}
                  onRemoveSelected={() => {
                    removeSelected(index);
                  }}
                  onVertical={(column, down, shift) => {
                    moveVertical(index, column, down, shift);
                  }}
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
                  onHorizontal={(column, left) => {
                    moveHorizontal(index, column, left);
                  }}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
      {selectedIndexes !== null && selectedIndexes.length === 1 ? (
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className={secondaryButtonClassName} onClick={copyOneSelected}>
            העתקת משטח
          </button>
        </div>
      ) : null}
      {selectedIndexes !== null && selectedIndexes.length > 1 ? (
        <div
          className="flex flex-wrap items-center gap-3"
          role="region"
          aria-label="פעולות על המשטחים שנבחרו"
        >
          {confirmingRemove ? (
            <>
              <p className="text-base leading-normal text-foreground">
                להסיר {selectedIndexes.length} משטחים מהטבלה?
              </p>
              <button
                type="button"
                className={compactDangerButtonClassName}
                onClick={() => {
                  removeIndexes(selectedIndexes);
                }}
              >
                אישור
              </button>
              <button
                type="button"
                className={secondaryButtonClassName}
                onClick={() => {
                  setConfirmingRemove(false);
                }}
              >
                חזרה
              </button>
            </>
          ) : (
            <>
              <p className="text-base leading-normal text-muted">
                {selectedIndexes.length} משטחים נבחרו
              </p>
              <button
                type="button"
                className={compactDangerButtonClassName}
                onClick={() => {
                  setConfirmingRemove(true);
                }}
              >
                הסרת המשטחים
              </button>
            </>
          )}
        </div>
      ) : null}
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
