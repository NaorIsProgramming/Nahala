import { CircleAlert } from "lucide-react";
import type { ReactNode } from "react";

export function FormError({ id, message }: { id: string; message: string }): ReactNode {
  return (
    <p id={id} role="alert" className="flex items-start gap-2 text-base leading-normal text-danger">
      <CircleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0" strokeWidth={2} />
      {message}
    </p>
  );
}
