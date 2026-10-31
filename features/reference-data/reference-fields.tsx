"use client";

import { CircleAlert } from "lucide-react";
import { useState, type ReactNode } from "react";

import { REFERENCE_NAME_MAX_LENGTH } from "@/lib/reference-limits";

import type { ReferenceActionState } from "./action-state";
import { nextFieldValues, type ReferenceFormValues } from "./form-values";

const fieldClassName =
  "min-h-11 w-full rounded-md border border-input bg-surface px-3 text-base text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60";

export function FormError({ id, message }: { id: string; message: string }): ReactNode {
  return (
    <p
      id={id}
      role="alert"
      className="flex items-start gap-2 text-base leading-normal text-danger"
    >
      <CircleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0" strokeWidth={2} />
      {message}
    </p>
  );
}

export function ReferenceFields({
  idPrefix,
  state,
  hasTare,
  hasInventory,
  defaultName,
  defaultTare,
  defaultInventory,
  clearOnSuccess,
  disabled,
}: {
  idPrefix: string;
  state: ReferenceActionState;
  hasTare: boolean;
  hasInventory: boolean;
  defaultName?: string;
  defaultTare?: string | null;
  defaultInventory?: boolean | null;
  clearOnSuccess: boolean;
  disabled: boolean;
}): ReactNode {
  const errorId = `${idPrefix}-error`;
  const hasError = state.status === "error";
  const nameInvalid = hasError && state.field === "name";
  const tareInvalid = hasError && state.field === "tareKilograms";
  const describedBy = hasError ? errorId : undefined;
  const [values, setValues] = useState<ReferenceFormValues>(() => ({
    name: defaultName ?? "",
    tareKilograms: defaultTare ?? "",
    countsInGrowerInventory: defaultInventory !== false,
  }));
  const [seenState, setSeenState] = useState(state);
  let shown = values;
  if (state !== seenState) {
    shown = nextFieldValues(values, state, clearOnSuccess);
    setSeenState(state);
    setValues(shown);
  }

  return (
    <>
      <div className="flex flex-col gap-2">
        <label htmlFor={`${idPrefix}-name`} className="text-base font-medium text-foreground">
          שם
        </label>
        <input
          id={`${idPrefix}-name`}
          name="name"
          required
          maxLength={REFERENCE_NAME_MAX_LENGTH}
          autoComplete="off"
          value={shown.name}
          onChange={(event) => {
            setValues((current) => ({ ...current, name: event.target.value }));
          }}
          disabled={disabled}
          aria-invalid={nameInvalid}
          aria-describedby={nameInvalid ? describedBy : undefined}
          className={fieldClassName}
        />
      </div>
      {hasTare ? (
        <div className="flex flex-col gap-2">
          <label htmlFor={`${idPrefix}-tare`} className="text-base font-medium text-foreground">
            טרה (ק״ג)
          </label>
          <input
            id={`${idPrefix}-tare`}
            name="tareKilograms"
            required
            inputMode="decimal"
            autoComplete="off"
            dir="ltr"
            value={shown.tareKilograms}
            onChange={(event) => {
              setValues((current) => ({
                ...current,
                tareKilograms: event.target.value,
              }));
            }}
            disabled={disabled}
            aria-invalid={tareInvalid}
            aria-describedby={tareInvalid ? describedBy : undefined}
            className={`${fieldClassName} tabular-nums`}
          />
        </div>
      ) : null}
      {hasInventory ? (
        <label className="flex min-h-11 items-center gap-3 text-base text-foreground">
          <input
            type="checkbox"
            name="countsInGrowerInventory"
            value="true"
            checked={shown.countsInGrowerInventory}
            onChange={(event) => {
              setValues((current) => ({
                ...current,
                countsInGrowerInventory: event.target.checked,
              }));
            }}
            disabled={disabled}
            className="size-5 accent-primary"
          />
          נספר במלאי המגדל
        </label>
      ) : null}
      {hasError && state.message ? <FormError id={errorId} message={state.message} /> : null}
    </>
  );
}
