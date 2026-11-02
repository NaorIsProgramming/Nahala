"use client";

import { useActionState, type ReactNode } from "react";

import { PALLET_KINDS, type PalletKind } from "@/lib/access-types";
import { PALLET_KIND_LABELS } from "@/lib/pallet-sets/kinds";

import { updatePalletSetKindAction } from "./actions";
import { idlePalletSetActionState } from "./action-state";
import { secondaryButtonClassName } from "./classes";
import { FormError } from "./form-error";
import { submitWithoutReset } from "./submit-form";

export function KindForm({
  id,
  revision,
  kind,
}: {
  id: string;
  revision: number;
  kind: PalletKind;
}): ReactNode {
  const [state, formAction, pending] = useActionState(
    updatePalletSetKindAction,
    idlePalletSetActionState,
  );

  return (
    <form
      onSubmit={(event) => {
        submitWithoutReset(event, formAction);
      }}
      className="flex flex-col gap-2"
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="revision" value={revision} />
      <fieldset className="flex flex-col gap-2" disabled={pending}>
        <legend className="text-base font-medium text-foreground">סוג</legend>
        <div className="flex flex-wrap gap-2">
          {PALLET_KINDS.map((option) => (
            <label
              key={option}
              className="inline-flex min-h-11 items-center gap-2 rounded-md border border-input bg-surface px-3 text-base text-foreground"
            >
              <input
                type="radio"
                name="kind"
                value={option}
                defaultChecked={option === kind}
                className="size-4 accent-primary"
              />
              {PALLET_KIND_LABELS[option]}
            </label>
          ))}
        </div>
      </fieldset>
      {state.status === "error" && state.message ? (
        <FormError id="kind-error" message={state.message} />
      ) : null}
      <button type="submit" disabled={pending} className={`${secondaryButtonClassName} self-start`}>
        שמירת הסוג
      </button>
    </form>
  );
}
