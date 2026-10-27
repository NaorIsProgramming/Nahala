import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { getSession } from "@/lib/session";

import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = {
  title: "כניסה",
};

export default async function SignInPage(): Promise<ReactNode> {
  const session = await getSession();

  if (session) {
    redirect("/app");
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <header className="flex p-4">
        <div className="ms-auto">
          <ThemeToggle />
        </div>
      </header>
      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 pb-16">
        <Logo />
        <h1 className="text-3xl font-semibold tracking-tight">כניסה</h1>
        <SignInForm />
      </main>
    </div>
  );
}
