"use client";

import { House } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";

type TableLink = {
  href: string;
  label: string;
};

export function AppNav({
  tables,
  showSets,
}: {
  tables: TableLink[];
  showSets: boolean;
}): ReactNode {
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }
    function onPointerDown(event: MouseEvent): void {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <nav aria-label="מסכים" className="flex flex-wrap items-center gap-2">
      <Link
        href="/app"
        className="inline-flex min-h-11 items-center gap-2 rounded-md px-2 text-base font-medium text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <House aria-hidden="true" className="size-5" strokeWidth={2} />
        בית
      </Link>
      {tables.length > 0 ? (
        <div
          ref={rootRef}
          className="relative"
          onMouseEnter={() => {
            setOpen(true);
          }}
          onMouseLeave={() => {
            setOpen(false);
          }}
        >
          <button
            type="button"
            aria-expanded={open}
            aria-controls={menuId}
            onClick={() => {
              setOpen((current) => !current);
            }}
            className="inline-flex min-h-11 items-center rounded-md px-2 text-base font-medium text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            טבלאות
          </button>
          {open ? (
            <ul
              id={menuId}
              className="absolute start-0 top-full z-30 min-w-44 overflow-hidden rounded-md border border-border bg-surface"
            >
              {tables.map((table) => (
                <li key={table.href}>
                  <Link
                    href={table.href}
                    className="flex min-h-11 items-center px-3 text-base text-foreground focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary"
                    onClick={() => {
                      setOpen(false);
                    }}
                  >
                    {table.label}
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
      {showSets ? (
        <Link
          href="/app/pallet-sets"
          className="inline-flex min-h-11 items-center rounded-md px-2 text-base font-medium text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          מיון ראשוני
        </Link>
      ) : null}
    </nav>
  );
}
