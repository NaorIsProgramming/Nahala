"use client";

import { CircleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";

import { authClient } from "@/lib/auth-client";

const WRONG_CREDENTIALS_MESSAGE = "הדוא״ל או הסיסמה שגויים";
const GENERIC_ERROR_MESSAGE = "לא הצלחנו להיכנס. נסו שוב.";

type SignInState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "error"; message: string };

export function SignInForm(): ReactNode {
  const router = useRouter();
  const [state, setState] = useState<SignInState>({ status: "idle" });
  const hasError = state.status === "error";
  const isSubmitting = state.status === "submitting";

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = formData.get("email");
    const password = formData.get("password");

    if (typeof email !== "string" || typeof password !== "string") {
      setState({ status: "error", message: WRONG_CREDENTIALS_MESSAGE });
      return;
    }

    setState({ status: "submitting" });

    const result = await authClient.signIn.email({ email, password });

    if (result.error) {
      const message =
        result.error.status === 400 || result.error.status === 401
          ? WRONG_CREDENTIALS_MESSAGE
          : GENERIC_ERROR_MESSAGE;
      setState({ status: "error", message });
      return;
    }

    router.refresh();
    router.push("/app");
  }

  return (
    <form
      // A submit before hydration must not put the password in the query string.
      method="post"
      onSubmit={handleSubmit}
      className="flex w-full max-w-sm flex-col gap-4"
    >
      <div className="flex flex-col gap-2">
        <label htmlFor="email" className="text-base font-medium text-foreground">
          דוא״ל
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          dir="ltr"
          spellCheck={false}
          disabled={isSubmitting}
          aria-invalid={hasError}
          aria-describedby={hasError ? "sign-in-error" : undefined}
          className="min-h-11 rounded-md border border-input bg-surface px-3 text-base text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"
        />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="password" className="text-base font-medium text-foreground">
          סיסמה
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          dir="ltr"
          disabled={isSubmitting}
          aria-invalid={hasError}
          aria-describedby={hasError ? "sign-in-error" : undefined}
          className="min-h-11 rounded-md border border-input bg-surface px-3 text-base text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"
        />
      </div>
      {hasError ? (
        <p
          id="sign-in-error"
          role="alert"
          className="flex items-start gap-2 text-base leading-normal text-danger"
        >
          <CircleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0" strokeWidth={2} />
          {state.message}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-4 text-base font-medium text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"
      >
        כניסה
      </button>
    </form>
  );
}
