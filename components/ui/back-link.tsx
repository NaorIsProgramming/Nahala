import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

type BackLinkProps = {
  href: string;
  label: string;
};

export function BackLink({ href, label }: BackLinkProps): ReactNode {
  return (
    <Link
      href={href}
      className="inline-flex min-h-11 items-center gap-2 self-start text-base font-medium text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <ChevronRight aria-hidden="true" className="size-5" strokeWidth={2} />
      {label}
    </Link>
  );
}
