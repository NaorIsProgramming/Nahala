"use client";

import { CircleAlert } from "lucide-react";
import type { PointerEvent as ReactPointerEvent, ReactNode } from "react";

import { formatGramsAsKilograms } from "@/lib/kilograms";
import { cn } from "@/lib/utils";

import type { PalletSetActionField } from "./action-state";
import { gridFieldClassName } from "./classes";
import {
  gridFieldName,
  previewNetGrams,
  type GridRow,
  type PackageChoice,
  type PalletTypeChoice,
} from "./grid-rows";
import { NameSearch } from "./name-search";

const cellClassName = "border-s border-b border-input/40 px-2 py-1 align-middle";
const numberCellClassName = "border-s border-b border-input/40 px-1 py-1 text-center align-middle";

type NamedChoice = { id: string; name: string };

export function PalletGridRow({
  row,
  index,
  yieldTypes,
  packageTypes,
  palletTypes,
  commonYieldIds,
  commonPackageIds,
  commonPalletTypeIds,
  pending,
  errorId,
  negativeErrorId,
  errorField,
  errorRow,
  palletNumbers,
  highlighted,
  onFieldFocus,
  onRowPointerDown,
  onRowPointerMove,
  onRowPointerUp,
  onRemoveSelected,
  onVertical,
  onHorizontal,
  onMove,
  onChange,
  onPackageChange,
}: {
  row: GridRow;
  index: number;
  yieldTypes: NamedChoice[];
  packageTypes: PackageChoice[];
  palletTypes: PalletTypeChoice[];
  commonYieldIds: string[];
  commonPackageIds: string[];
  commonPalletTypeIds: string[];
  pending: boolean;
  errorId: string;
  negativeErrorId: string;
  errorField?: PalletSetActionField;
  errorRow?: number;
  palletNumbers?: number[];
  highlighted: boolean;
  onFieldFocus: () => void;
  onRowPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onRowPointerMove: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onRowPointerUp: () => void;
  onRemoveSelected: () => void;
  onVertical: (column: number, down: boolean, shift: boolean) => void;
  onHorizontal: (column: number, left: boolean) => void;
  onMove: (row: number, column: number) => void;
  onChange: (patch: Partial<GridRow>) => void;
  onPackageChange: (packageTypeId: string) => void;
}): ReactNode {
  const grams = previewNetGrams(row, packageTypes, palletTypes);
  const negative = grams !== null && grams < 0;
  const numberInvalid =
    (errorField === "palletNumber" && errorRow === index) ||
    (errorField === "palletNumber" &&
      palletNumbers !== undefined &&
      palletNumbers.includes(Number(row.palletNumber)));

  return (
    <tr
      data-pallet-row={index}
      onFocusCapture={(event) => {
        const target = event.target;
        if (target instanceof Element && target.closest("[data-row-gutter]") !== null) {
          return;
        }
        onFieldFocus();
      }}
      className={highlighted ? "bg-background" : undefined}
    >
      <td className="border-b border-input/40 px-1 py-1 text-center align-middle">
        <button
          type="button"
          data-row-gutter={index}
          aria-label={`שורה ${index + 1}`}
          disabled={pending}
          onPointerDown={onRowPointerDown}
          onPointerMove={onRowPointerMove}
          onPointerUp={onRowPointerUp}
          onKeyDown={(event) => {
            if (event.key === "Delete" || event.key === "Backspace") {
              event.preventDefault();
              onRemoveSelected();
              return;
            }
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              onVertical(-1, event.key === "ArrowDown", event.shiftKey);
              return;
            }
            if (
              (event.key === "ArrowLeft" || event.key === "ArrowRight") &&
              (event.ctrlKey || event.metaKey)
            ) {
              event.preventDefault();
              onHorizontal(-1, event.key === "ArrowLeft");
            }
          }}
          className="w-full cursor-default select-none text-base tabular-nums text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"
        >
          {index + 1}
        </button>
      </td>
      <td className={numberCellClassName}>
        <input type="hidden" name={gridFieldName(index, "id")} value={row.id ?? ""} />
        <GridNumber
          id={`row-${index}-number`}
          name={gridFieldName(index, "palletNumber")}
          label={`מספר משטח, שורה ${index + 1}`}
          value={row.palletNumber}
          cellKey={`${index}-0`}
          invalid={numberInvalid}
          describedBy={describedBy(numberInvalid, errorId, false, negativeErrorId)}
          disabled={pending}
          decimal={false}
          onChange={(value) => {
            onChange({ palletNumber: value });
          }}
          onEnter={() => {
            onMove(index, 0);
          }}
          onVertical={(down, shift) => {
            onVertical(0, down, shift);
          }}
          onHorizontal={(left) => {
            onHorizontal(0, left);
          }}
        />
      </td>
      <td className={cellClassName}>
        <TypeCell
          id={`row-${index}-yield`}
          name={gridFieldName(index, "yieldTypeId")}
          label={`סוג יבול, שורה ${index + 1}`}
          value={row.yieldTypeId}
          cellKey={`${index}-1`}
          options={yieldTypes}
          commonIds={commonYieldIds}
          invalid={errorField === "yieldTypeId" && errorRow === index}
          errorId={errorId}
          disabled={pending}
          onChange={(value) => {
            onChange({ yieldTypeId: value });
          }}
          onEnter={() => {
            onMove(index, 1);
          }}
          onVertical={(down, shift) => {
            onVertical(1, down, shift);
          }}
          onHorizontal={(left) => {
            onHorizontal(1, left);
          }}
        />
      </td>
      <td className={cellClassName}>
        <TypeCell
          id={`row-${index}-package`}
          name={gridFieldName(index, "packageTypeId")}
          label={`סוג אריזה, שורה ${index + 1}`}
          value={row.packageTypeId}
          cellKey={`${index}-2`}
          options={packageTypes}
          commonIds={commonPackageIds}
          invalid={errorField === "packageTypeId" && errorRow === index}
          errorId={errorId}
          disabled={pending}
          onChange={onPackageChange}
          onEnter={() => {
            onMove(index, 2);
          }}
          onVertical={(down, shift) => {
            onVertical(2, down, shift);
          }}
          onHorizontal={(left) => {
            onHorizontal(2, left);
          }}
        />
      </td>
      <td className={cellClassName}>
        <TypeCell
          id={`row-${index}-pallet-type`}
          name={gridFieldName(index, "palletTypeId")}
          label={`סוג משטח, שורה ${index + 1}`}
          value={row.palletTypeId}
          cellKey={`${index}-3`}
          options={palletTypes}
          commonIds={commonPalletTypeIds}
          invalid={errorField === "palletTypeId" && errorRow === index}
          errorId={errorId}
          disabled={pending}
          onChange={(value) => {
            onChange({ palletTypeId: value });
          }}
          onEnter={() => {
            onMove(index, 3);
          }}
          onVertical={(down, shift) => {
            onVertical(3, down, shift);
          }}
          onHorizontal={(left) => {
            onHorizontal(3, left);
          }}
        />
      </td>
      <td className={numberCellClassName}>
        <GridNumber
          id={`row-${index}-amount`}
          name={gridFieldName(index, "packageAmount")}
          label={`כמות אריזות, שורה ${index + 1}`}
          value={row.packageAmount}
          cellKey={`${index}-4`}
          invalid={errorField === "packageAmount" && errorRow === index}
          describedBy={describedBy(
            errorField === "packageAmount" && errorRow === index,
            errorId,
            false,
            negativeErrorId,
          )}
          disabled={pending}
          decimal={false}
          onChange={(value) => {
            onChange({ packageAmount: value });
          }}
          onEnter={() => {
            onMove(index, 4);
          }}
          onVertical={(down, shift) => {
            onVertical(4, down, shift);
          }}
          onHorizontal={(left) => {
            onHorizontal(4, left);
          }}
        />
      </td>
      <td className={numberCellClassName}>
        <GridNumber
          id={`row-${index}-gross`}
          name={gridFieldName(index, "grossWeightKilograms")}
          label={`משקל ברוטו, שורה ${index + 1}`}
          value={row.grossWeightKilograms}
          cellKey={`${index}-5`}
          invalid={negative || (errorField === "grossWeightKilograms" && errorRow === index)}
          describedBy={describedBy(
            errorField === "grossWeightKilograms" && errorRow === index,
            errorId,
            negative,
            negativeErrorId,
          )}
          disabled={pending}
          decimal
          onChange={(value) => {
            onChange({ grossWeightKilograms: value });
          }}
          onEnter={() => {
            onMove(index, 5);
          }}
          onVertical={(down, shift) => {
            onVertical(5, down, shift);
          }}
          onHorizontal={(left) => {
            onHorizontal(5, left);
          }}
        />
      </td>
      <td className={numberCellClassName}>
        <NetPreview grams={grams} negative={negative} />
      </td>
    </tr>
  );
}

function TypeCell({
  id,
  name,
  label,
  value,
  cellKey,
  options,
  commonIds,
  invalid,
  errorId,
  disabled,
  onChange,
  onEnter,
  onVertical,
  onHorizontal,
}: {
  id: string;
  name: string;
  label: string;
  value: string;
  cellKey: string;
  options: NamedChoice[];
  commonIds: string[];
  invalid: boolean;
  errorId: string;
  disabled: boolean;
  onChange: (value: string) => void;
  onEnter: () => void;
  onVertical: (down: boolean, shift: boolean) => void;
  onHorizontal: (left: boolean) => void;
}): ReactNode {
  return (
    <NameSearch
      id={id}
      name={name}
      label={label}
      labelHidden
      value={value}
      cellKey={cellKey}
      portalMenu
      options={options}
      commonIds={commonIds}
      required
      invalid={invalid}
      errorId={errorId}
      disabled={disabled}
      inputClassName={gridFieldClassName}
      onChange={onChange}
      onEnter={onEnter}
      onVerticalArrow={onVertical}
      onHorizontalArrow={onHorizontal}
    />
  );
}

function GridNumber({
  id,
  name,
  label,
  value,
  cellKey,
  invalid,
  describedBy,
  disabled,
  decimal,
  onChange,
  onEnter,
  onVertical,
  onHorizontal,
}: {
  id: string;
  name: string;
  label: string;
  value: string;
  cellKey: string;
  invalid: boolean;
  describedBy?: string;
  disabled: boolean;
  decimal: boolean;
  onChange: (value: string) => void;
  onEnter: () => void;
  onVertical: (down: boolean, shift: boolean) => void;
  onHorizontal: (left: boolean) => void;
}): ReactNode {
  return (
    <>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <input
        id={id}
        name={name}
        required
        value={value}
        inputMode={decimal ? "decimal" : "numeric"}
        autoComplete="off"
        dir="ltr"
        disabled={disabled}
        data-grid-cell={cellKey}
        aria-invalid={invalid}
        aria-describedby={describedBy}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            onEnter();
            return;
          }
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            onVertical(event.key === "ArrowDown", event.shiftKey);
            return;
          }
          if (
            (event.key === "ArrowLeft" || event.key === "ArrowRight") &&
            (event.ctrlKey || event.metaKey)
          ) {
            event.preventDefault();
            onHorizontal(event.key === "ArrowLeft");
          }
        }}
        className={cn(gridFieldClassName, "px-1 text-center tabular-nums")}
      />
    </>
  );
}

function NetPreview({ grams, negative }: { grams: number | null; negative: boolean }): ReactNode {
  if (grams === null) {
    return <span className="text-muted">—</span>;
  }
  return (
    <span className={`inline-flex w-full items-center justify-center gap-1 ${negative ? "text-danger" : "text-foreground"}`}>
      {negative ? <CircleAlert aria-hidden="true" className="size-5 shrink-0" strokeWidth={2} /> : null}
      <bdi dir="ltr" className="tabular-nums">
        {formatGramsAsKilograms(grams)}
      </bdi>
      {negative ? <span>שלילי</span> : null}
    </span>
  );
}

function describedBy(
  serverInvalid: boolean,
  errorId: string,
  negative: boolean,
  negativeErrorId: string,
): string | undefined {
  const ids = [
    ...(serverInvalid ? [errorId] : []),
    ...(negative ? [negativeErrorId] : []),
  ];
  return ids.length > 0 ? ids.join(" ") : undefined;
}

