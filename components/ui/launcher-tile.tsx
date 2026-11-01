import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

type LauncherTileProps = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export function LauncherTile({
  href,
  label,
  icon: Icon,
}: LauncherTileProps): ReactNode {
  return (
    <Link
      href={href}
      className="flex size-28 flex-col items-center justify-center gap-2 rounded-lg border border-border bg-surface px-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <Icon aria-hidden="true" className="size-6 text-primary" strokeWidth={2} />
      <span className="text-center text-base font-medium leading-normal text-foreground">
        {label}
      </span>
    </Link>
  );
}
