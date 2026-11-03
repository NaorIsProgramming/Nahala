import type { Metadata } from "next";
import { Boxes, Table2 } from "lucide-react";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { Logo } from "@/components/brand/logo";
import { LauncherTile } from "@/components/ui/launcher-tile";
import { canReadSets } from "@/features/pallet-sets/visibility";
import { writableReferenceTables } from "@/features/reference-data/visible-tables";
import { getActor } from "@/lib/access";

export const metadata: Metadata = {
  title: "נחלה",
};

export default async function AppHomePage(): Promise<ReactNode> {
  const actor = await getActor();
  if (!actor) {
    redirect("/sign-in");
  }

  const showTables = writableReferenceTables(actor).length > 0;
  const showSets = canReadSets(actor);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center gap-6 px-4 pb-16">
      <div className="flex items-center gap-3">
        <Logo alt="" className="size-12" />
        <h1 className="text-3xl font-semibold tracking-tight">נחלה</h1>
      </div>
      {!showTables && !showSets ? (
        <p className="text-center text-base leading-normal text-muted">
          אין מסכים זמינים לחשבון זה.
        </p>
      ) : (
        <div className="flex flex-wrap justify-center gap-4">
          {showTables ? <LauncherTile href="/app/tables" label="טבלאות" icon={Table2} /> : null}
          {showSets ? (
            <LauncherTile href="/app/pallet-sets" label="מיון ראשוני" icon={Boxes} />
          ) : null}
        </div>
      )}
    </main>
  );
}
