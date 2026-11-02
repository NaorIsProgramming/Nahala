"use client";

import { useActionState, type ReactNode } from "react";

import { removePalletAction } from "./actions";
import { idlePalletSetActionState } from "./action-state";
import { secondaryButtonClassName } from "./classes";
import { FormError } from "./form-error";
import { submitWithoutReset } from "./submit-form";

export function RemovePalletButton({
  setId,
  revision,
  palletId,
  palletNumber,
}: {
  setId: string;
  revision: number;
  palletId: string;
  palletNumber: number;
}): ReactNode {
  const [state, formAction, pending] = useActionState(
    removePalletAction,
    idlePalletSetActionState,
  );
  const errorId = `remove-${palletId}`;

  return (
    <form
      onSubmit={(event) => {
        submitWithoutReset(event, formAction);
      }}
      className="flex flex-col items-start gap-2"
    >
      <input type="hidden" name="setId" value={setId} />
      <input type="hidden" name="revision" value={revision} />
      <input type="hidden" name="palletId" value={palletId} />
      <button
        type="submit"
        disabled={pending}
        className={secondaryButtonClassName}
        aria-label={`הסרת משטח ${palletNumber}`}
      >
        הסרה
      </button>
      {state.status === "error" && state.message ? (
        <FormError id={errorId} message={state.message} />
      ) : null}
    </form>
  );
}
