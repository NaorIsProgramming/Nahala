"use client";

import { useActionState, useEffect, useState, type ReactNode } from "react";

import { isPalletKind, PALLET_KINDS, type PalletKind } from "@/lib/access-types";
import { PALLET_KIND_LABELS } from "@/lib/pallet-sets/kinds";

import { createPalletSetAction } from "./actions";
import { idlePalletSetActionState } from "./action-state";
import { fieldClassName, primaryButtonClassName } from "./classes";
import { DateField } from "./date-field";
import { savePalletSetEntryAction } from "./entry-action";
import { FormError } from "./form-error";
import {
  gridRowsFromRecord,
  NEGATIVE_NET_MESSAGE,
  previewNetGrams,
  type GridRow,
  type PackageChoice,
  type PalletTypeChoice,
} from "./grid-rows";
import { NameSearch } from "./name-search";
import { PalletGrid } from "./pallet-grid";
import { clearPalletDraft, readPalletDraft } from "./pallet-draft";
import { submitWithoutReset } from "./submit-form";

const kindOptions = PALLET_KINDS.map((kind) => ({
  id: kind,
  name: PALLET_KIND_LABELS[kind],
}));

const errorId = "pallet-entry-error";
const negativeErrorId = "pallet-entry-negative";

type NamedChoice = { id: string; name: string };

type CatalogProps = {
  growers: NamedChoice[];
  commonGrowerIds: string[];
  canCreateGrower: boolean;
  yieldTypes: NamedChoice[];
  packageTypes: PackageChoice[];
  palletTypes: PalletTypeChoice[];
  commonYieldIds: string[];
  commonPackageIds: string[];
  commonPalletTypeIds: string[];
  canAddRows: boolean;
  createdField?: string;
  createdId?: string;
};

type Props = CatalogProps &
  (
    | { mode: "create"; defaultDate: string }
    | {
        mode: "edit";
        setId: string;
        revision: number;
        kind: PalletKind;
        referenceNumber: number;
        growerId: string;
        receivedOn: string;
        initialRows: GridRow[];
      }
  );

export function PalletEntryForm(props: Props): ReactNode {
  const action = props.mode === "create" ? createPalletSetAction : savePalletSetEntryAction;
  const [state, formAction, pending] = useActionState(action, idlePalletSetActionState);
  const [kind, setKind] = useState(props.mode === "edit" ? props.kind : "A");
  const [referenceNumber, setReferenceNumber] = useState(
    props.mode === "edit" ? String(props.referenceNumber) : "",
  );
  const [growerId, setGrowerId] = useState(props.mode === "edit" ? props.growerId : "");
  const [receivedOn, setReceivedOn] = useState(
    props.mode === "edit" ? props.receivedOn : props.defaultDate,
  );
  const [rows, setRows] = useState<GridRow[]>(props.mode === "edit" ? props.initialRows : []);
  const [revision, setRevision] = useState(props.mode === "edit" ? props.revision : 1);
  const [seenRevision, setSeenRevision] = useState(state.revision);
  if (state.revision !== undefined && state.revision !== seenRevision) {
    setSeenRevision(state.revision);
    setRevision(state.revision);
  }

  const { createdField, createdId } = props;
  useEffect(() => {
    const draft = readPalletDraft();
    if (!draft || !isEntryDraft(draft.field)) {
      return;
    }
    clearPalletDraft();
    const values = draft.values;
    // sessionStorage is empty during render, so the draft is applied after hydration.
    /* eslint-disable react-hooks/set-state-in-effect -- restore the form the user left */
    if (values.kind && isPalletKind(values.kind)) {
      setKind(values.kind);
    }
    if (values.referenceNumber) {
      setReferenceNumber(values.referenceNumber);
    }
    if (values.receivedOn) {
      setReceivedOn(values.receivedOn);
    }
    const restoredGrower =
      createdField === "growerId" && createdId ? createdId : values.growerId;
    if (restoredGrower) {
      setGrowerId(restoredGrower);
    }
    const restoredRows = gridRowsFromRecord(values);
    if (restoredRows) {
      setRows(restoredRows);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [createdField, createdId]);

  const hasNegative = rows.some((row) => {
    const grams = previewNetGrams(row, props.packageTypes, props.palletTypes);
    return grams !== null && grams < 0;
  });
  const hasError = state.status === "error";

  return (
    <form
      onSubmit={(event) => {
        if (hasNegative) {
          event.preventDefault();
          return;
        }
        submitWithoutReset(event, formAction);
      }}
      className="flex flex-col gap-6"
    >
      {props.mode === "edit" ? (
        <>
          <input type="hidden" name="id" value={props.setId} />
          <input type="hidden" name="revision" value={revision} />
        </>
      ) : null}
      <div className="grid max-w-3xl gap-4 sm:grid-cols-2">
        <NameSearch
          id="entry-kind"
          name="kind"
          label="סוג"
          options={kindOptions}
          commonIds={[]}
          value={kind}
          onChange={(next) => {
            if (isPalletKind(next)) {
              setKind(next);
            }
          }}
          required
          disabled={pending}
          invalid={hasError && state.field === "kind"}
          errorId={errorId}
          onEnter={() => {
            document.getElementById("entry-reference")?.focus();
          }}
        />
        <div className="flex flex-col gap-2">
          <label htmlFor="entry-reference" className="text-base font-medium text-foreground">
            אסמכתא
          </label>
          <input
            id="entry-reference"
            name="referenceNumber"
            required
            inputMode="numeric"
            autoComplete="off"
            dir="ltr"
            value={referenceNumber}
            disabled={pending}
            aria-invalid={
              hasError && (state.field === "referenceNumber" || state.field === "revision")
            }
            aria-describedby={
              hasError && (state.field === "referenceNumber" || state.field === "revision")
                ? errorId
                : undefined
            }
            onChange={(event) => {
              setReferenceNumber(event.target.value);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                document.getElementById("entry-grower")?.focus();
              }
            }}
            className={`${fieldClassName} tabular-nums`}
          />
        </div>
        <NameSearch
          id="entry-grower"
          name="growerId"
          label="מגדל"
          options={props.growers}
          commonIds={props.commonGrowerIds}
          value={growerId}
          onChange={setGrowerId}
          createHref={props.canCreateGrower ? "/app/growers" : undefined}
          required
          disabled={pending}
          invalid={hasError && state.field === "growerId"}
          errorId={errorId}
          onEnter={() => {
            document.getElementById("entry-date")?.focus();
          }}
        />
        <DateField
          id="entry-date"
          name="receivedOn"
          label="תאריך קבלה"
          defaultIso={receivedOn}
          required
          disabled={pending}
          invalid={hasError && state.field === "receivedOn"}
          errorId={errorId}
          onCommit={setReceivedOn}
          onEnter={focusFirstRow}
        />
      </div>
      <h2 className="text-xl font-semibold tracking-tight">משטחים</h2>
      <PalletGrid
        rows={rows}
        onRowsChange={setRows}
        yieldTypes={props.yieldTypes}
        packageTypes={props.packageTypes}
        palletTypes={props.palletTypes}
        commonYieldIds={props.commonYieldIds}
        commonPackageIds={props.commonPackageIds}
        commonPalletTypeIds={props.commonPalletTypeIds}
        canAddRows={props.canAddRows}
        pending={pending}
        errorId={errorId}
        negativeErrorId={negativeErrorId}
        errorField={hasError ? state.field : undefined}
        errorRow={state.rowIndex}
        palletNumbers={state.palletNumbers}
      />
      {hasError && state.message ? <FormError id={errorId} message={state.message} /> : null}
      {hasNegative ? <FormError id={negativeErrorId} message={NEGATIVE_NET_MESSAGE} /> : null}
      <div>
        <button type="submit" disabled={pending || hasNegative} className={primaryButtonClassName}>
          שמירה
        </button>
      </div>
    </form>
  );
}

function focusFirstRow(): void {
  const first = document.querySelector<HTMLElement>('[data-grid-cell="0-0"]');
  if (first) {
    first.focus();
    return;
  }
  document.getElementById("pallet-grid-add")?.focus();
}

function isEntryDraft(field: string): boolean {
  return (
    field === "kind" ||
    field === "referenceNumber" ||
    field === "growerId" ||
    field === "receivedOn" ||
    field.startsWith("row.")
  );
}
