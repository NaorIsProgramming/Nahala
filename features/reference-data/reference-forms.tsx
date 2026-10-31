"use client";

import { startTransition, useActionState, type FormEvent, type ReactNode } from "react";

import {
  idleReferenceActionState,
  type ReferenceActionState,
} from "./action-state";
import { FormError, ReferenceFields } from "./reference-fields";

const primaryButtonClassName =
  "inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-4 text-base font-medium text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60";

const secondaryButtonClassName =
  "inline-flex min-h-11 items-center justify-center self-start rounded-md border border-input bg-surface px-4 text-base font-medium text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60";

type ReferenceAction = (
  state: ReferenceActionState,
  formData: FormData,
) => Promise<ReferenceActionState>;

type ReferenceFormFields = {
  hasTare: boolean;
  hasInventory: boolean;
};

export type ReferenceRowValues = {
  id: string;
  name: string;
  isActive: boolean;
  tareKilograms: string | null;
  countsInGrowerInventory: boolean | null;
};

function submitWithoutReset(
  event: FormEvent<HTMLFormElement>,
  action: (formData: FormData) => void,
): void {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  startTransition(() => {
    action(formData);
  });
}

export function CreateReferenceForm({
  idPrefix,
  action,
  hasTare,
  hasInventory,
}: ReferenceFormFields & {
  idPrefix: string;
  action: ReferenceAction;
}): ReactNode {
  const [state, formAction, pending] = useActionState(action, idleReferenceActionState);

  return (
    <form
      onSubmit={(event) => {
        submitWithoutReset(event, formAction);
      }}
      className="flex flex-col gap-4"
    >
      <ReferenceFields
        idPrefix={idPrefix}
        state={state}
        hasTare={hasTare}
        hasInventory={hasInventory}
        clearOnSuccess
        disabled={pending}
      />
      <button type="submit" disabled={pending} className={primaryButtonClassName}>
        הוספה
      </button>
    </form>
  );
}

export function ReferenceRowForm({
  row,
  action,
  deactivateAction,
  hasTare,
  hasInventory,
}: ReferenceFormFields & {
  row: ReferenceRowValues;
  action: ReferenceAction;
  deactivateAction: ReferenceAction;
}): ReactNode {
  const [state, formAction, pending] = useActionState(action, idleReferenceActionState);
  const [deactivateState, deactivateFormAction, deactivatePending] = useActionState(
    deactivateAction,
    idleReferenceActionState,
  );
  const busy = pending || deactivatePending;

  return (
    <div className="flex flex-col gap-4">
      <form
        onSubmit={(event) => {
          submitWithoutReset(event, formAction);
        }}
        className="flex flex-col gap-4"
      >
        <input type="hidden" name="id" value={row.id} />
        <ReferenceFields
          idPrefix={row.id}
          state={state}
          hasTare={hasTare}
          hasInventory={hasInventory}
          defaultName={row.name}
          defaultTare={row.tareKilograms}
          defaultInventory={row.countsInGrowerInventory}
          clearOnSuccess={false}
          disabled={busy}
        />
        <button type="submit" disabled={busy} className={primaryButtonClassName}>
          שמירה
        </button>
      </form>
      {row.isActive ? (
        <form action={deactivateFormAction}>
          <input type="hidden" name="id" value={row.id} />
          {deactivateState.status === "error" && deactivateState.message ? (
            <FormError id={`${row.id}-deactivate-error`} message={deactivateState.message} />
          ) : null}
          <button
            type="submit"
            disabled={busy}
            aria-label={`השבתת ${row.name}`}
            className={secondaryButtonClassName}
          >
            השבתה
          </button>
        </form>
      ) : null}
    </div>
  );
}
