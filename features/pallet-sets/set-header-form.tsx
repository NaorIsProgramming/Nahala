"use client";

import { startTransition, useActionState, useEffect, useState, type ReactNode } from "react";

import { isPalletKind, PALLET_KINDS, type PalletKind } from "@/lib/access-types";
import { PALLET_KIND_LABELS } from "@/lib/pallet-sets/kinds";

import { updatePalletSetHeaderAction } from "./actions";
import { idlePalletSetActionState } from "./action-state";
import { DateField } from "./date-field";
import { FormError } from "./form-error";
import { NameSearch } from "./name-search";
import { clearPalletDraft, readPalletDraft } from "./pallet-draft";

const kindOptions = PALLET_KINDS.map((kind) => ({
  id: kind,
  name: PALLET_KIND_LABELS[kind],
}));

export function SetHeaderForm({
  id,
  revision,
  kind,
  growerId,
  growers,
  commonGrowerIds,
  receivedOn,
  canCreateGrower,
  createdField,
  createdId,
}: {
  id: string;
  revision: number;
  kind: PalletKind;
  growerId: string;
  growers: { id: string; name: string }[];
  commonGrowerIds: string[];
  receivedOn: string;
  canCreateGrower: boolean;
  createdField?: string;
  createdId?: string;
}): ReactNode {
  const [state, formAction, pending] = useActionState(
    updatePalletSetHeaderAction,
    idlePalletSetActionState,
  );
  const [kindId, setKindId] = useState(kind);
  const [currentGrowerId, setCurrentGrowerId] = useState(growerId);

  function commit(patch: { kind?: string; growerId?: string; receivedOn?: string }): void {
    const formData = new FormData();
    formData.set("id", id);
    formData.set("revision", String(revision));
    if (patch.kind) {
      formData.set("kind", patch.kind);
    }
    if (patch.growerId) {
      formData.set("growerId", patch.growerId);
    }
    if (patch.receivedOn) {
      formData.set("receivedOn", patch.receivedOn);
    }
    startTransition(() => {
      formAction(formData);
    });
  }

  useEffect(() => {
    const draft = readPalletDraft();
    if (!draft || draft.field !== "growerId") {
      return;
    }
    clearPalletDraft();
    if (createdField === "growerId" && createdId) {
      // The new grower id arrives only after the table screen sends the user back.
      // eslint-disable-next-line react-hooks/set-state-in-effect -- apply the created grower once
      setCurrentGrowerId(createdId);
      commit({ growerId: createdId });
    }
    // commit is recreated each render and this restore must run once.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot return from the grower screen
  }, [createdField, createdId]);

  return (
    <>
      <NameSearch
        id={`${id}-kind`}
        name="kind"
        label="סוג"
        options={kindOptions}
        commonIds={[]}
        value={kindId}
        disabled={pending}
        onChange={(next) => {
          if (!isPalletKind(next)) {
            return;
          }
          setKindId(next);
          if (next !== kindId) {
            commit({ kind: next });
          }
        }}
      />
      <NameSearch
        id={`${id}-grower`}
        name="growerId"
        label="מגדל"
        options={growers}
        commonIds={commonGrowerIds}
        value={currentGrowerId}
        disabled={pending}
        createHref={canCreateGrower ? "/app/growers" : undefined}
        onChange={(next) => {
          setCurrentGrowerId(next);
          if (next.length > 0 && next !== currentGrowerId) {
            commit({ growerId: next });
          }
        }}
      />
      <DateField
        id={`${id}-date`}
        name="receivedOn"
        label="תאריך"
        defaultIso={receivedOn}
        disabled={pending}
        onCommit={(isoDate) => {
          commit({ receivedOn: isoDate });
        }}
      />
      {state.status === "error" && state.message ? (
        <FormError id={`${id}-header-error`} message={state.message} />
      ) : null}
    </>
  );
}
