import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { ThemeToggle } from "@/components/theme-toggle";
import { getSession } from "@/lib/session";

import { SignOutButton } from "./sign-out-button";

export default async function AppLayout({
  children,
}: {
  children: ReactNode;
}): Promise<ReactNode> {
  const session = await getSession();
  if (!session) {
    redirect("/sign-in");
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <header className="flex flex-wrap items-center gap-2 p-4">
        <SignOutButton />
        <p className="min-w-0 truncate text-base text-muted">
          <bdi>{session.user.name}</bdi>
        </p>
        <div className="ms-auto">
          <ThemeToggle />
        </div>
      </header>
      {children}
    </div>
  );
}
