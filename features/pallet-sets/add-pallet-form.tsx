"use client";

import { useActionState, useEffect, useState, type ReactNode } from "react";

import { addPalletAction } from "./actions";
import { idlePalletSetActionState, type PalletSetActionState } from "./action-state";
import { fieldClassName, primaryButtonClassName } from "./classes";
import { FormError } from "./form-error";
import { NameSearch } from "./name-search";
import { clearPalletDraft, readPalletDraft } from "./pallet-draft";
import { submitWithoutReset } from "./submit-form";

type NamedChoice = { id: string; name: string };

type PackageChoice = NamedChoice & { recommendedPackageAmount: number | null };

type AddFields = {
  palletNumber: string;
  yieldTypeId: string;
  packageTypeId: string;
  palletTypeId: string;
  packageAmount: string;
  grossWeightKilograms: string;
};

const emptyFields: AddFields = {
  palletNumber: "",
  yieldTypeId: "",
  packageTypeId: "",
  palletTypeId: "",
  packageAmount: "",
  grossWeightKilograms: "",
};

export function AddPalletForm({
  setId,
  revision,
  yieldTypes,
  packageTypes,
  palletTypes,
  commonYieldIds,
  commonPackageIds,
  commonPalletTypeIds,
  canCreateYield,
  canCreatePackage,
  canCreatePalletType,
  createdField,
  createdId,
}: {
  setId: string;
  revision: number;
  yieldTypes: NamedChoice[];
  packageTypes: PackageChoice[];
  palletTypes: NamedChoice[];
  commonYieldIds: string[];
  commonPackageIds: string[];
  commonPalletTypeIds: string[];
  canCreateYield: boolean;
  canCreatePackage: boolean;
  canCreatePalletType: boolean;
  createdField?: string;
  createdId?: string;
}): ReactNode {
  const [state, formAction, pending] = useActionState(addPalletAction, idlePalletSetActionState);
  const [fields, setFields] = useState<AddFields>(emptyFields);
  useEffect(() => {
    const draft = readPalletDraft();
    const owned = ["yieldTypeId", "packageTypeId", "palletTypeId", "palletNumber", "packageAmount", "grossWeightKilograms"];
    if (!draft || !owned.includes(draft.field)) {
      return;
    }
    clearPalletDraft();
    // The draft is written in sessionStorage before leaving this page, so it can only be read after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- restore the pallet form the user left
    setFields({
      palletNumber: draft.values.palletNumber ?? "",
      yieldTypeId: draft.values.yieldTypeId ?? "",
      packageTypeId: draft.values.packageTypeId ?? "",
      palletTypeId: draft.values.palletTypeId ?? "",
      packageAmount: draft.values.packageAmount ?? "",
      grossWeightKilograms: draft.values.grossWeightKilograms ?? "",
      ...(createdField !== undefined && createdId !== undefined && createdField === draft.field
        ? { [createdField]: createdId }
        : {}),
    });
  }, [createdField, createdId]);
  const [seenState, setSeenState] = useState<PalletSetActionState>(state);
  let shown = fields;
  if (state !== seenState) {
    shown =
      state.status === "success"
        ? { ...fields, palletNumber: "", grossWeightKilograms: "" }
        : fields;
    setSeenState(state);
    setFields(shown);
  }

  const errorId = "add-pallet-error";
  const hasError = state.status === "error";
  const invalidField = hasError ? state.field : undefined;

  return (
    <form
      onSubmit={(event) => {
        submitWithoutReset(event, formAction);
      }}
      className="grid gap-4 rounded-lg border border-border bg-surface p-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      <input type="hidden" name="setId" value={setId} />
      <input type="hidden" name="revision" value={revision} />
      <h2 className="text-xl font-semibold tracking-tight sm:col-span-2 lg:col-span-3">הוספת משטח</h2>
      <Field
        id="add-pallet-number"
        name="palletNumber"
        label="מספר משטח"
        value={shown.palletNumber}
        invalid={invalidField === "palletNumber"}
        errorId={errorId}
        disabled={pending}
        numeric
        onChange={(value) => {
          setFields((current) => ({ ...current, palletNumber: value }));
        }}
      />
      <NameSearch
        id="add-yield"
        name="yieldTypeId"
        label="סוג יבול"
        value={shown.yieldTypeId}
        invalid={invalidField === "yieldTypeId"}
        errorId={errorId}
        disabled={pending}
        required
        options={yieldTypes}
        commonIds={commonYieldIds}
        createHref={canCreateYield ? "/app/yield-types" : undefined}
        onChange={(value) => {
          setFields((current) => ({ ...current, yieldTypeId: value }));
        }}
      />
      <NameSearch
        id="add-package"
        name="packageTypeId"
        label="סוג אריזה"
        value={shown.packageTypeId}
        invalid={invalidField === "packageTypeId"}
        errorId={errorId}
        disabled={pending}
        required
        options={packageTypes}
        commonIds={commonPackageIds}
        createHref={canCreatePackage ? "/app/package-types" : undefined}
        onChange={(value) => {
          const selected = packageTypes.find((option) => option.id === value);
          setFields((current) => ({
            ...current,
            packageTypeId: value,
            packageAmount:
              selected?.recommendedPackageAmount == null
                ? current.packageAmount
                : String(selected.recommendedPackageAmount),
          }));
        }}
      />
      <NameSearch
        id="add-pallet-type"
        name="palletTypeId"
        label="סוג משטח"
        value={shown.palletTypeId}
        invalid={invalidField === "palletTypeId"}
        errorId={errorId}
        disabled={pending}
        required
        options={palletTypes}
        commonIds={commonPalletTypeIds}
        createHref={canCreatePalletType ? "/app/pallet-types" : undefined}
        onChange={(value) => {
          setFields((current) => ({ ...current, palletTypeId: value }));
        }}
      />
      <Field
        id="add-amount"
        name="packageAmount"
        label="כמות אריזות"
        value={shown.packageAmount}
        invalid={invalidField === "packageAmount"}
        errorId={errorId}
        disabled={pending}
        numeric
        onChange={(value) => {
          setFields((current) => ({ ...current, packageAmount: value }));
        }}
      />
      <Field
        id="add-gross"
        name="grossWeightKilograms"
        label="משקל ברוטו (ק״ג)"
        value={shown.grossWeightKilograms}
        invalid={invalidField === "grossWeightKilograms"}
        errorId={errorId}
        disabled={pending}
        numeric
        onChange={(value) => {
          setFields((current) => ({ ...current, grossWeightKilograms: value }));
        }}
      />
      {hasError && state.message ? (
        <div className="sm:col-span-2 lg:col-span-3">
          <FormError id={errorId} message={state.message} />
        </div>
      ) : null}
      {state.status === "success" && state.message ? (
        <p className="text-base leading-normal text-foreground sm:col-span-2 lg:col-span-3" role="status">
          {state.message}
        </p>
      ) : null}
      <div className="sm:col-span-2 lg:col-span-3">
        <button type="submit" disabled={pending} className={primaryButtonClassName}>
          הוספה
        </button>
      </div>
    </form>
  );
}

function Field({
  id,
  name,
  label,
  value,
  invalid,
  errorId,
  disabled,
  numeric,
  onChange,
}: {
  id: string;
  name: string;
  label: string;
  value: string;
  invalid: boolean;
  errorId: string;
  disabled: boolean;
  numeric: boolean;
  onChange: (value: string) => void;
}): ReactNode {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-base font-medium text-foreground">
        {label}
      </label>
      <input
        id={id}
        name={name}
        required
        value={value}
        inputMode={numeric ? "decimal" : "text"}
        autoComplete="off"
        dir="ltr"
        disabled={disabled}
        aria-invalid={invalid}
        aria-describedby={invalid ? errorId : undefined}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        className={`${fieldClassName} tabular-nums`}
      />
    </div>
  );
}

