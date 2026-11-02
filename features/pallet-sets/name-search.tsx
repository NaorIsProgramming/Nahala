"use client";

import { useRouter } from "next/navigation";
import { useId, useState, type KeyboardEvent, type ReactNode } from "react";

import { fieldClassName } from "./classes";
import { suggestNames, type NamedOption } from "./name-match";
import { savePalletDraft } from "./pallet-draft";
import { safePalletSetReturn } from "./return-path";

const CREATE_ID = "__create__";

export function FilterNameSearch({
  defaultId = "",
  ...props
}: Omit<Parameters<typeof NameSearch>[0], "value" | "onChange"> & {
  defaultId?: string;
}): ReactNode {
  const [value, setValue] = useState(defaultId);
  return <NameSearch {...props} value={value} onChange={setValue} />;
}

export function NameSearch({
  id,
  name,
  label,
  options,
  commonIds,
  value,
  onChange,
  required = false,
  invalid = false,
  errorId,
  disabled = false,
  createHref,
}: {
  id: string;
  name: string;
  label: string;
  options: NamedOption[];
  commonIds: string[];
  value: string;
  onChange: (id: string) => void;
  required?: boolean;
  invalid?: boolean;
  errorId?: string;
  disabled?: boolean;
  createHref?: string;
}): ReactNode {
  const router = useRouter();
  const listId = useId();
  const selected = options.find((option) => option.id === value);
  const [text, setText] = useState(selected?.name ?? "");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [seenValue, setSeenValue] = useState(value);
  if (value !== seenValue) {
    setSeenValue(value);
    setText(options.find((option) => option.id === value)?.name ?? "");
  }

  const suggestionQuery = selected !== undefined && text === selected.name ? "" : text;
  const suggestions = suggestNames(options, commonIds, suggestionQuery);
  const showCreate =
    createHref !== undefined && text.trim().length > 0 && suggestions.length === 0;
  const activeIndex = suggestions.length === 0 ? -1 : Math.min(highlight, suggestions.length - 1);

  function choose(option: NamedOption): void {
    onChange(option.id);
    setText(option.name);
    setOpen(false);
    setHighlight(0);
  }

  function commitTyped(): void {
    if (text.trim().length === 0 || (selected !== undefined && text === selected.name)) {
      return;
    }
    const exact = options.find((option) => option.name.trim() === text.trim());
    const pick = exact ?? suggestions[0];
    if (pick) {
      choose(pick);
    }
  }

  function openCreate(typedName: string): void {
    if (createHref === undefined) {
      return;
    }
    const form = document.getElementById(id);
    const values: Record<string, string> = {};
    if (form instanceof HTMLInputElement && form.form) {
      for (const [key, entry] of new FormData(form.form)) {
        if (typeof entry === "string") {
          values[key] = entry;
        }
      }
    }
    savePalletDraft({ field: name, values });
    const returnTo = safePalletSetReturn(`${window.location.pathname}${window.location.search}`);
    const href = new URL(createHref, window.location.origin);
    if (returnTo) {
      href.searchParams.set("returnTo", returnTo);
    }
    href.searchParams.set("prefill", typedName);
    href.searchParams.set("createdField", name);
    router.push(`${href.pathname}${href.search}`);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setHighlight((current) => Math.min(suggestions.length - 1, current + 1));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      setHighlight((current) => Math.max(0, current - 1));
      return;
    }
    if (event.key === "Enter") {
      if (!open || suggestions.length === 0) {
        if (open) {
          event.preventDefault();
        }
        return;
      }
      event.preventDefault();
      const pick = suggestions[activeIndex] ?? suggestions[0];
      if (pick) {
        choose(pick);
      }
      return;
    }
    if (event.key === "Tab") {
      commitTyped();
    }
  }

  return (
    <div className="relative flex flex-col gap-2">
      <label htmlFor={id} className="text-base font-medium text-foreground">
        {label}
      </label>
      <input type="hidden" name={name} value={value} />
      <input
        id={id}
        value={text}
        required={required}
        disabled={disabled}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={
          open && activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined
        }
        aria-invalid={invalid}
        aria-describedby={invalid ? errorId : undefined}
        onFocus={() => {
          setOpen(true);
        }}
        onBlur={() => {
          commitTyped();
          setOpen(false);
        }}
        onKeyDown={onKeyDown}
        onChange={(event) => {
          const next = event.target.value;
          setText(next);
          setOpen(true);
          setHighlight(0);
          if (selected !== undefined && next !== selected.name) {
            onChange("");
          }
        }}
        className={fieldClassName}
      />
      {open && (suggestions.length > 0 || showCreate) ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute inset-x-0 top-full z-10 mt-1 overflow-hidden rounded-md border border-border bg-surface"
        >
          {suggestions.map((option, index) => (
            <li key={option.id}>
              <button
                id={`${listId}-${index}`}
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                onMouseDown={(event) => {
                  event.preventDefault();
                  choose(option);
                }}
                className={`min-h-11 w-full px-3 text-start text-base text-foreground focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary ${index === activeIndex ? "bg-background" : ""}`}
              >
                {option.name}
              </button>
            </li>
          ))}
          {showCreate ? (
            <li key={CREATE_ID}>
              <button
                type="button"
                onMouseDown={(event) => {
                  event.preventDefault();
                  openCreate(text.trim());
                }}
                className="min-h-11 w-full px-3 text-start text-base text-primary focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary"
              >
                יצירת {text.trim()}
              </button>
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}
