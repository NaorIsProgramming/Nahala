"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

const themes = [
  { value: "light", label: "מצב בהיר", icon: Sun },
  { value: "dark", label: "מצב כהה", icon: Moon },
  { value: "system", label: "לפי המערכת", icon: Monitor },
] as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [hasMounted, setHasMounted] = useState(false);

  // next-themes reads localStorage on the client render, which does not match
  // the server HTML. Apply the selected state only after hydration.
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setHasMounted(true);
    }, 0);

    return () => {
      window.clearTimeout(timeout);
    };
  }, []);

  return (
    <div role="group" aria-label="בחירת ערכת נושא" className="flex gap-2">
      {themes.map(({ value, label, icon: Icon }) => {
        const isSelected = hasMounted && theme === value;

        return (
          <button
            key={value}
            type="button"
            aria-label={label}
            aria-pressed={isSelected}
            onClick={() => {
              setTheme(value);
            }}
            className={cn(
              "inline-flex size-11 items-center justify-center rounded-md border border-input",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
              isSelected
                ? "bg-primary text-primary-foreground"
                : "bg-surface text-foreground",
            )}
          >
            <Icon aria-hidden="true" className="size-5" strokeWidth={2} />
          </button>
        );
      })}
    </div>
  );
}
