import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { BackLink } from "@/components/ui/back-link";
import { canWriteReference, getActor } from "@/lib/access";
import type { ReferenceTable } from "@/lib/access-types";
import { formatGramsAsKilograms } from "@/lib/kilograms";
import { listReferenceAdmin } from "@/lib/services/reference-data";

import {
  createReferenceAction,
  deactivateReferenceAction,
  updateReferenceAction,
} from "./actions";
import {
  CreateReferenceForm,
  ReferenceRowForm,
  type ReferenceRowValues,
} from "./reference-forms";
import { referenceTableMeta } from "./table-meta";

type ReferenceAdminPageProps = {
  table: ReferenceTable;
};

export async function ReferenceAdminPage({
  table,
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

  const rows = listed.data.map((row) => toRowValues(row));
  const createAction = createReferenceAction.bind(null, table);
  const updateAction = updateReferenceAction.bind(null, table);
  const deactivateAction = deactivateReferenceAction.bind(null, table);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 pb-16">
      <BackLink href="/app/tables" label="טבלאות" />
      <h1 className="text-3xl font-semibold tracking-tight">{meta.label}</h1>
      <section className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4">
        <h2 className="text-xl font-semibold tracking-tight">רשומה חדשה</h2>
        <CreateReferenceForm
          key={rows.map((row) => row.id).join(",") || "empty"}
          idPrefix={`${table}-create`}
          action={createAction}
          hasTare={meta.hasTare}
          hasInventory={meta.hasInventory}
        />
      </section>
      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold tracking-tight">רשומות</h2>
        {rows.length === 0 ? (
          <p className="text-base leading-normal text-muted">אין רשומות עדיין.</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {rows.map((row) => (
              <li
                key={rowKey(row)}
                className="flex min-w-0 flex-col gap-4 rounded-lg border border-border bg-surface p-4"
              >
                <p
                  className={
                    row.isActive
                      ? "text-base leading-normal text-foreground"
                      : "text-base leading-normal text-muted"
                  }
                >
                  {row.isActive ? "פעיל" : "לא פעיל"}
                </p>
                <ReferenceRowForm
                  row={row}
                  action={updateAction}
                  deactivateAction={deactivateAction}
                  hasTare={meta.hasTare}
                  hasInventory={meta.hasInventory}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

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
  countsInGrowerInventory: boolean | null;
}): ReferenceRowValues {
  return {
    id: row.id,
    name: row.name,
    isActive: row.isActive,
    tareKilograms: row.tareGrams === null ? null : formatGramsAsKilograms(row.tareGrams),
    countsInGrowerInventory: row.countsInGrowerInventory,
  };
}

function rowKey(row: ReferenceRowValues): string {
  return [
    row.id,
    row.name,
    row.tareKilograms ?? "",
    String(row.countsInGrowerInventory),
    String(row.isActive),
  ].join(":");
}
