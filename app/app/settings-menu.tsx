"use client";

import { Settings } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";

import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

import { SignOutButton } from "./sign-out-button";

export function AppSettingsMenu(): ReactNode {
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent): void {
      if (!(event.target instanceof Node) || !rootRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label="הגדרות"
        aria-expanded={isOpen}
        aria-controls={menuId}
        onClick={() => {
          setIsOpen((current) => !current);
        }}
        className={cn(
          "inline-flex size-11 items-center justify-center rounded-md border border-input",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
          isOpen ? "bg-primary text-primary-foreground" : "bg-surface text-foreground",
        )}
      >
        <Settings aria-hidden="true" className="size-5" strokeWidth={2} />
      </button>
      {isOpen ? (
        <div
          id={menuId}
          className="absolute end-0 top-full z-30 mt-2 flex flex-col gap-3 rounded-lg border border-border bg-surface p-3"
        >
          <ThemeToggle />
          <SignOutButton />
        </div>
      ) : null}
    </div>
  );
}
