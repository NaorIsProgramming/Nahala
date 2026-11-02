"use client";

import { useActionState, useEffect, useState, type ReactNode } from "react";

import { isPalletKind, PALLET_KINDS } from "@/lib/access-types";
import { PALLET_KIND_LABELS } from "@/lib/pallet-sets/kinds";

import { createPalletSetAction } from "./actions";
import { idlePalletSetActionState } from "./action-state";
import { fieldClassName, primaryButtonClassName } from "./classes";
import { DateField } from "./date-field";
import { FormError } from "./form-error";
import { NameSearch } from "./name-search";
import { clearPalletDraft, readPalletDraft } from "./pallet-draft";
import { submitWithoutReset } from "./submit-form";

type GrowerChoice = { id: string; name: string };

const kindOptions = PALLET_KINDS.map((kind) => ({
  id: kind,
  name: PALLET_KIND_LABELS[kind],
}));

export function NewSetForm({
  growers,
  commonGrowerIds,
  defaultDate,
  canCreateGrower,
  createdField,
  createdId,
}: {
  growers: GrowerChoice[];
  commonGrowerIds: string[];
  defaultDate: string;
  canCreateGrower: boolean;
  createdField?: string;
  createdId?: string;
}): ReactNode {
  const [state, formAction, pending] = useActionState(
    createPalletSetAction,
    idlePalletSetActionState,
  );
  const [kind, setKind] = useState("A");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [growerId, setGrowerId] = useState("");
  const [receivedOn, setReceivedOn] = useState(defaultDate);
  useEffect(() => {
    const draft = readPalletDraft();
    if (!draft || !["kind", "referenceNumber", "growerId", "receivedOn"].includes(draft.field)) {
      return;
    }
    clearPalletDraft();
    // sessionStorage is empty during render, so the draft is applied after hydration.
    /* eslint-disable react-hooks/set-state-in-effect -- restore the new-set form the user left */
    if (draft.values.kind && isPalletKind(draft.values.kind)) {
      setKind(draft.values.kind);
    }
    if (draft.values.referenceNumber) {
      setReferenceNumber(draft.values.referenceNumber);
    }
    if (draft.values.receivedOn) {
      setReceivedOn(draft.values.receivedOn);
    }
    const restoredGrower =
      createdField === "growerId" && createdId ? createdId : draft.values.growerId;
    if (restoredGrower) {
      setGrowerId(restoredGrower);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [createdField, createdId]);
  const errorId = "new-set-error";
  const hasError = state.status === "error";

  return (
    <form
      onSubmit={(event) => {
        submitWithoutReset(event, formAction);
      }}
      className="grid gap-4 rounded-lg border border-border bg-surface p-4 sm:grid-cols-2"
    >
      <NameSearch
        id="new-kind"
        name="kind"
        label="סוג"
        options={kindOptions}
        commonIds={[]}
        value={kind}
        onChange={setKind}
        required
        disabled={pending}
        invalid={hasError && state.field === "kind"}
        errorId={errorId}
      />
      <div className="flex flex-col gap-2">
        <label htmlFor="new-reference" className="text-base font-medium text-foreground">
          אסמכתא
        </label>
        <input
          id="new-reference"
          name="referenceNumber"
          required
          inputMode="numeric"
          autoComplete="off"
          dir="ltr"
          value={referenceNumber}
          onChange={(event) => {
            setReferenceNumber(event.target.value);
          }}
          disabled={pending}
          aria-invalid={hasError && state.field === "referenceNumber"}
          aria-describedby={hasError && state.field === "referenceNumber" ? errorId : undefined}
          className={`${fieldClassName} tabular-nums`}
        />
      </div>
      <NameSearch
        id="new-grower"
        name="growerId"
        label="מגדל"
        options={growers}
        commonIds={commonGrowerIds}
        value={growerId}
        onChange={setGrowerId}
        createHref={canCreateGrower ? "/app/growers" : undefined}
        required
        disabled={pending}
        invalid={hasError && state.field === "growerId"}
        errorId={errorId}
      />
      <DateField
        id="new-date"
        name="receivedOn"
        label="תאריך קבלה"
        defaultIso={receivedOn}
        required
        disabled={pending}
        invalid={hasError && state.field === "receivedOn"}
        errorId={errorId}
        onCommit={setReceivedOn}
      />
      {hasError && state.message ? <FormError id={errorId} message={state.message} /> : null}
      <div className="sm:col-span-2">
        <button type="submit" disabled={pending} className={primaryButtonClassName}>
          שמירה
        </button>
      </div>
    </form>
  );
}
