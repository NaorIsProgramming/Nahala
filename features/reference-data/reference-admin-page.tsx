import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { BackLink } from "@/components/ui/back-link";
import type { AuditSubjectType } from "@/db/schema/audit";
import { canWriteReference, getActor } from "@/lib/access";
import type { ReferenceTable } from "@/lib/access-types";
import { formatGramsAsKilograms } from "@/lib/kilograms";
import { listReferenceAdmin } from "@/lib/services/reference-data";

import {
  createReferenceAction,
  deactivateReferenceAction,
  updateReferenceAction,
} from "./actions";
import type { ReferenceRowValues } from "./reference-forms";
import { ReferenceMasterDetail } from "./reference-master-detail";
import { safePalletSetReturn } from "@/features/pallet-sets/return-path";

import { referenceTableMeta } from "./table-meta";

type ReferenceAdminPageProps = {
  table: ReferenceTable;
  returnTo?: string;
  prefillName?: string;
  createdField?: string;
};

export async function ReferenceAdminPage({
  table,
  returnTo,
  prefillName,
  createdField,
}: ReferenceAdminPageProps): Promise<ReactNode> {
  const actor = await getActor();
  if (!actor) {
    redirect("/sign-in");
  }

  const meta = referenceTableMeta[table];
  if (!canWriteReference(actor, table)) {
    return <AccessDenied />;
  }

  const listed = await listReferenceAdmin(actor, table);
  if (!listed.ok) {
    return <AccessDenied />;
  }

  const safeReturn = safePalletSetReturn(returnTo);
  const rows = listed.data.map((row) => toRowValues(row));
  const createAction = createReferenceAction.bind(null, table);
  const updateAction = updateReferenceAction.bind(null, table);
  const deactivateAction = deactivateReferenceAction.bind(null, table);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 pb-16">
      <BackLink href="/app/tables" label="טבלאות" />
      <h1 className="text-3xl font-semibold tracking-tight">{meta.label}</h1>
      <ReferenceMasterDetail
        idPrefix={table}
        rows={rows}
        hasTare={meta.hasTare}
        tareRequired={meta.tareRequired}
        hasInventory={meta.hasInventory}
        hasPackageMeasures={meta.hasPackageMeasures}
        createAction={createAction}
        updateAction={updateAction}
        deactivateAction={deactivateAction}
        startOnCreate={safeReturn !== null && prefillName !== undefined && prefillName.length > 0}
        prefillName={prefillName}
        returnTo={safeReturn ?? undefined}
        createdField={createdField}
        historySubjectType={AUDIT_SUBJECT_BY_TABLE[table]}
      />
    </main>
  );
}

const AUDIT_SUBJECT_BY_TABLE = {
  growers: "grower",
  yield_types: "yield_type",
  package_types: "package_type",
  pallet_types: "pallet_type",
} as const satisfies Record<ReferenceTable, AuditSubjectType>;

function AccessDenied(): ReactNode {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-4 pb-16">
      <BackLink href="/app" label="נחלה" />
      <h1 className="text-3xl font-semibold tracking-tight">אין הרשאה</h1>
      <p className="text-base leading-normal text-muted">
        החשבון הזה לא יכול לפתוח את המסך.
      </p>
    </main>
  );
}

function toRowValues(row: {
  id: string;
  name: string;
  isActive: boolean;
  tareGrams: number | null;
  netWeightGrams: number | null;
  recommendedPackageAmount: number | null;
  countsInGrowerInventory: boolean | null;
}): ReferenceRowValues {
  return {
    id: row.id,
    name: row.name,
    isActive: row.isActive,
    tareKilograms: row.tareGrams === null ? null : formatGramsAsKilograms(row.tareGrams),
    netWeightKilograms:
      row.netWeightGrams === null ? null : formatGramsAsKilograms(row.netWeightGrams),
    recommendedPackageAmount:
      row.recommendedPackageAmount === null ? null : String(row.recommendedPackageAmount),
    countsInGrowerInventory: row.countsInGrowerInventory,
  };
}

