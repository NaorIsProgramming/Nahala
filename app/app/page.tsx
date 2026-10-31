import type { Metadata } from "next";
import { Table2 } from "lucide-react";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { LauncherTile } from "@/components/ui/launcher-tile";
import { getActor } from "@/lib/access";
import { writableReferenceTables } from "@/features/reference-data/visible-tables";

export const metadata: Metadata = {
  title: "נחלה",
};

export default async function AppHomePage(): Promise<ReactNode> {
  const actor = await getActor();
  if (!actor) {
    redirect("/sign-in");
  }

  const tables = writableReferenceTables(actor);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 pb-16">
      <h1 className="text-3xl font-semibold tracking-tight">נחלה</h1>
      {tables.length === 0 ? (
        <p className="text-base leading-normal text-muted">אין מסכים זמינים לחשבון זה.</p>
      ) : (
        <div className="flex flex-wrap justify-start gap-4">
          <LauncherTile href="/app/tables" label="טבלאות" icon={Table2} />
        </div>
      )}
    </main>
  );
}
