"use client";

import { useId, useState, type ReactNode } from "react";

import { fieldClassName } from "./classes";
import { suggestNames, type NamedOption } from "./name-match";

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
}): ReactNode {
  const listId = useId();
  const selected = options.find((option) => option.id === value);
  const [text, setText] = useState(selected?.name ?? "");
  const [open, setOpen] = useState(false);
  const [seenValue, setSeenValue] = useState(value);
  if (value !== seenValue) {
    setSeenValue(value);
    setText(options.find((option) => option.id === value)?.name ?? "");
  }

  const suggestionQuery = selected !== undefined && text === selected.name ? "" : text;
  const suggestions = suggestNames(options, commonIds, suggestionQuery);

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
        aria-invalid={invalid}
        aria-describedby={invalid ? errorId : undefined}
        onFocus={() => {
          setOpen(true);
        }}
        onBlur={() => {
          setOpen(false);
        }}
        onChange={(event) => {
          const next = event.target.value;
          setText(next);
          setOpen(true);
          if (selected !== undefined && next !== selected.name) {
            onChange("");
          }
        }}
        className={fieldClassName}
      />
      {open && suggestions.length > 0 ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute inset-x-0 top-full z-10 mt-1 overflow-hidden rounded-md border border-border bg-surface"
        >
          {suggestions.map((option) => (
            <li key={option.id}>
              <button
                type="button"
                role="option"
                aria-selected={option.id === value}
                onMouseDown={(event) => {
                  event.preventDefault();
                  onChange(option.id);
                  setText(option.name);
                  setOpen(false);
                }}
                className="min-h-11 w-full px-3 text-start text-base text-foreground hover:bg-background focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary"
              >
                {option.name}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {open && suggestions.length === 0 ? (
        <p className="text-base leading-normal text-muted">אין התאמות.</p>
      ) : null}
    </div>
  );
}
