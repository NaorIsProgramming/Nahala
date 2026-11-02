"use client";

import { Ban } from "lucide-react";
import { useActionState, useState, type ReactNode } from "react";

import { voidPalletSetAction } from "./actions";
import { idlePalletSetActionState } from "./action-state";
import { dangerButtonClassName, secondaryButtonClassName } from "./classes";
import { FormError } from "./form-error";
import { submitWithoutReset } from "./submit-form";

export function VoidSetForm({ id, revision }: { id: string; revision: number }): ReactNode {
  const [state, formAction, pending] = useActionState(
    voidPalletSetAction,
    idlePalletSetActionState,
  );
  const [confirming, setConfirming] = useState(false);
  const showConfirm = confirming || state.status === "error";

  if (!showConfirm) {
    return (
      <button
        type="button"
        className={dangerButtonClassName}
        onClick={() => {
          setConfirming(true);
        }}
      >
        <Ban aria-hidden="true" className="size-5" strokeWidth={2} />
        ביטול הסט
      </button>
    );
  }

  return (
    <form
      onSubmit={(event) => {
        submitWithoutReset(event, formAction);
      }}
      className="flex flex-col items-start gap-3 rounded-lg border border-border bg-surface p-4"
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="revision" value={revision} />
      <p className="text-base leading-normal text-foreground">
        לבטל את הסט? הוא יוסר מהרשימה הפעילה ויופיע ברשימת המבוטלים.
      </p>
      {state.status === "error" && state.message ? (
        <FormError id="void-set-error" message={state.message} />
      ) : null}
      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={pending} className={dangerButtonClassName}>
          <Ban aria-hidden="true" className="size-5" strokeWidth={2} />
          אישור הביטול
        </button>
        <button
          type="button"
          disabled={pending}
          className={secondaryButtonClassName}
          onClick={() => {
            setConfirming(false);
          }}
        >
          חזרה
        </button>
      </div>
    </form>
  );
}
