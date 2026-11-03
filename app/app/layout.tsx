import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { AppNav } from "@/components/app-nav";
import { writableReferenceTables } from "@/features/reference-data/visible-tables";
import { referenceTableMeta } from "@/features/reference-data/table-meta";
import { canReadSets } from "@/features/pallet-sets/visibility";
import { getActor } from "@/lib/access";
import { getSession } from "@/lib/session";

import { AppSettingsMenu } from "./settings-menu";

export default async function AppLayout({
  children,
}: {
  children: ReactNode;
}): Promise<ReactNode> {
  const session = await getSession();
  if (!session) {
    redirect("/sign-in");
  }
  const actor = await getActor();
  const tables =
    actor === null
      ? []
      : writableReferenceTables(actor).map((table) => ({
          href: referenceTableMeta[table].href,
          label: referenceTableMeta[table].label,
        }));

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background text-foreground">
      <header className="flex shrink-0 flex-wrap items-center gap-2 p-4">
        <AppNav tables={tables} showSets={actor !== null && canReadSets(actor)} />
        <p className="min-w-0 truncate text-base text-muted">
          <bdi>{session.user.name}</bdi>
        </p>
        <div className="ms-auto">
          <AppSettingsMenu />
        </div>
      </header>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">{children}</div>
    </div>
  );
}
