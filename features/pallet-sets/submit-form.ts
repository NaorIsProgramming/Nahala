"use client";

import { startTransition, type FormEvent } from "react";

export function submitWithoutReset(
  event: FormEvent<HTMLFormElement>,
  action: (formData: FormData) => void,
): void {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  startTransition(() => {
    action(formData);
  });
}
