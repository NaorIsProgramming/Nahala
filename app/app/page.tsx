import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { ThemeToggle } from "@/components/theme-toggle";
import { getSession } from "@/lib/session";

import { SignOutButton } from "./sign-out-button";

export const metadata: Metadata = {
  title: "אזור מוגן",
};

export default async function ProtectedPage(): Promise<ReactNode> {
  const session = await getSession();

  if (!session) {
    redirect("/sign-in");
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <header className="flex items-center gap-2 p-4">
        <SignOutButton />
        <div className="ms-auto">
          <ThemeToggle />
        </div>
      </header>
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 pb-16 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">אזור מוגן</h1>
        <p className="text-base leading-normal text-muted">
          <bdi>{session.user.name}</bdi>
        </p>
      </main>
    </div>
  );
}
