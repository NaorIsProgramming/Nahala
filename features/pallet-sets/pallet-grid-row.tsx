"use client";

import { CircleAlert } from "lucide-react";
import type { ReactNode } from "react";

import { formatGramsAsKilograms } from "@/lib/kilograms";

import type { PalletSetActionField } from "./action-state";
import { fieldClassName, secondaryButtonClassName } from "./classes";
import {
  gridFieldName,
  previewNetGrams,
  type GridRow,
  type PackageChoice,
  type PalletTypeChoice,
} from "./grid-rows";
import { NameSearch } from "./name-search";

const cellClassName = "border-b border-border px-2 py-2 align-top";

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
  onMove,
  onChange,
  onPackageChange,
  onRemove,
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
  onMove: (row: number, column: number) => void;
  onChange: (patch: Partial<GridRow>) => void;
  onPackageChange: (packageTypeId: string) => void;
  onRemove: () => void;
}): ReactNode {
  const grams = previewNetGrams(row, packageTypes, palletTypes);
  const negative = grams !== null && grams < 0;
  const numberInvalid =
    (errorField === "palletNumber" && errorRow === index) ||
    (errorField === "palletNumber" &&
      palletNumbers !== undefined &&
      palletNumbers.includes(Number(row.palletNumber)));

  return (
    <tr>
      <td className={cellClassName}>
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
        />
      </td>
      <td className={cellClassName}>
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
        />
      </td>
      <td className={cellClassName}>
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
        />
      </td>
      <td className={cellClassName}>
        <NetPreview grams={grams} negative={negative} />
      </td>
      <td className={cellClassName}>
        <button
          type="button"
          disabled={pending}
          onClick={onRemove}
          className={secondaryButtonClassName}
          aria-label={
            row.palletNumber.length > 0
              ? `הסרת משטח ${row.palletNumber}`
              : `הסרת שורה ${index + 1}`
          }
        >
          הסרה
        </button>
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
      onChange={onChange}
      onEnter={onEnter}
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
          }
        }}
        className={`${fieldClassName} tabular-nums`}
      />
    </>
  );
}

function NetPreview({ grams, negative }: { grams: number | null; negative: boolean }): ReactNode {
  if (grams === null) {
    return <span className="text-muted">—</span>;
  }
  return (
    <span className={`inline-flex items-center gap-1 ${negative ? "text-danger" : "text-foreground"}`}>
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

