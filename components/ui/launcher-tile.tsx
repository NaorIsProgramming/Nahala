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
      className="flex h-28 w-full max-w-xs flex-col items-center justify-center gap-3 rounded-lg border border-border bg-surface px-6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:w-64"
    >
      <Icon aria-hidden="true" className="size-8 text-primary" strokeWidth={2} />
      <span className="text-base font-medium leading-normal text-foreground">
        {label}
      </span>
    </Link>
  );
}
