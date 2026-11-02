"use client";

import { useActionState, useState, type ReactNode } from "react";

import { PALLET_KINDS } from "@/lib/access-types";
import { PALLET_KIND_LABELS } from "@/lib/pallet-sets/kinds";

import { createPalletSetAction } from "./actions";
import { idlePalletSetActionState } from "./action-state";
import { fieldClassName, primaryButtonClassName } from "./classes";
import { FormError } from "./form-error";
import { NameSearch } from "./name-search";
import { submitWithoutReset } from "./submit-form";

type GrowerChoice = { id: string; name: string };

export function NewSetForm({
  growers,
  commonGrowerIds,
  defaultDate,
}: {
  growers: GrowerChoice[];
  commonGrowerIds: string[];
  defaultDate: string;
}): ReactNode {
  const [state, formAction, pending] = useActionState(
    createPalletSetAction,
    idlePalletSetActionState,
  );
  const [growerId, setGrowerId] = useState("");
  const errorId = "new-set-error";
  const hasError = state.status === "error";

  return (
    <form
      onSubmit={(event) => {
        submitWithoutReset(event, formAction);
      }}
      className="grid gap-4 rounded-lg border border-border bg-surface p-4 sm:grid-cols-2"
    >
      <div className="flex flex-col gap-2">
        <label htmlFor="new-kind" className="text-base font-medium text-foreground">
          סוג
        </label>
        <select
          id="new-kind"
          name="kind"
          required
          disabled={pending}
          defaultValue="A"
          aria-invalid={hasError && state.field === "kind"}
          aria-describedby={hasError && state.field === "kind" ? errorId : undefined}
          className={fieldClassName}
        >
          {PALLET_KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {PALLET_KIND_LABELS[kind]}
            </option>
          ))}
        </select>
      </div>
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
        required
        disabled={pending}
        invalid={hasError && state.field === "growerId"}
        errorId={errorId}
      />
      <div className="flex flex-col gap-2">
        <label htmlFor="new-date" className="text-base font-medium text-foreground">
          תאריך קבלה
        </label>
        <input
          id="new-date"
          name="receivedOn"
          type="date"
          required
          dir="ltr"
          disabled={pending}
          defaultValue={defaultDate}
          aria-invalid={hasError && state.field === "receivedOn"}
          aria-describedby={hasError && state.field === "receivedOn" ? errorId : undefined}
          className={`${fieldClassName} tabular-nums`}
        />
      </div>
      {hasError && state.message ? <FormError id={errorId} message={state.message} /> : null}
      <div className="sm:col-span-2">
        <button type="submit" disabled={pending} className={primaryButtonClassName}>
          שמירה
        </button>
      </div>
    </form>
  );
}
