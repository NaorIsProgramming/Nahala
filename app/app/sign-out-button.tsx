"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";

import { authClient } from "@/lib/auth-client";

type SignOutState = { status: "idle" } | { status: "submitting" };

export function SignOutButton(): ReactNode {
  const router = useRouter();
  const [state, setState] = useState<SignOutState>({ status: "idle" });

  async function handleClick(): Promise<void> {
    setState({ status: "submitting" });

    const result = await authClient.signOut();

    if (result.error) {
      setState({ status: "idle" });
      return;
    }

    router.refresh();
    router.push("/sign-in");
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={state.status === "submitting"}
      className="inline-flex min-h-11 items-center justify-center rounded-md border border-input bg-surface px-4 text-base font-medium text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"
    >
      יציאה
    </button>
  );
}
