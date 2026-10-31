import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { BackLink } from "@/components/ui/back-link";
import { LauncherTile } from "@/components/ui/launcher-tile";
import { getActor } from "@/lib/access";
import { referenceTableIcons } from "@/features/reference-data/table-icons";
import { referenceTableMeta } from "@/features/reference-data/table-meta";
import { writableReferenceTables } from "@/features/reference-data/visible-tables";

export const metadata: Metadata = {
  title: "טבלאות",
};

export default async function TablesPage(): Promise<ReactNode> {
  const actor = await getActor();
  if (!actor) {
    redirect("/sign-in");
  }

  const tables = writableReferenceTables(actor);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 pb-16">
      <BackLink href="/app" label="נחלה" />
      <h1 className="text-3xl font-semibold tracking-tight">טבלאות</h1>
      {tables.length === 0 ? (
        <p className="text-base leading-normal text-muted">אין מסכים זמינים לחשבון זה.</p>
      ) : (
        <div className="flex flex-wrap justify-start gap-4">
          {tables.map((table) => {
            const meta = referenceTableMeta[table];
            return (
              <LauncherTile
                key={table}
                href={meta.href}
                label={meta.label}
                icon={referenceTableIcons[table]}
              />
            );
          })}
        </div>
      )}
    </main>
  );
}
