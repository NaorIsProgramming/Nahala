"use client";

import { useState, type ReactNode } from "react";

import { fieldClassName } from "./classes";
import { formatFullDate, parseFlexibleDate } from "./dates";

export function DateField({
  id,
  name,
  label,
  defaultIso = "",
  required = false,
  disabled = false,
  invalid = false,
  errorId,
  onCommit,
}: {
  id: string;
  name: string;
  label: string;
  defaultIso?: string;
  required?: boolean;
  disabled?: boolean;
  invalid?: boolean;
  errorId?: string;
  onCommit?: (isoDate: string) => void;
}): ReactNode {
  const [text, setText] = useState(defaultIso.length > 0 ? formatFullDate(defaultIso) : "");
  const [iso, setIso] = useState(defaultIso);
  const [seenIso, setSeenIso] = useState(defaultIso);
  if (defaultIso !== seenIso) {
    setSeenIso(defaultIso);
    setIso(defaultIso);
    setText(defaultIso.length > 0 ? formatFullDate(defaultIso) : "");
  }

  function commit(nextText: string): void {
    const parsed = parseFlexibleDate(nextText);
    if (parsed === null) {
      return;
    }
    setIso(parsed);
    setText(formatFullDate(parsed));
    if (parsed !== defaultIso) {
      onCommit?.(parsed);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-base font-medium text-foreground">
        {label}
      </label>
      <input type="hidden" name={name} value={iso} />
      <div className="flex items-center gap-2">
        <input
          id={id}
          value={text}
          required={required}
          disabled={disabled}
          autoComplete="off"
          inputMode="numeric"
          aria-invalid={invalid}
          aria-describedby={invalid ? errorId : undefined}
          onChange={(event) => {
            setText(event.target.value);
          }}
          onBlur={() => {
            commit(text);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commit(text);
            }
          }}
          className={`${fieldClassName} tabular-nums`}
        />
        <input
          type="date"
          aria-label={label}
          disabled={disabled}
          value={iso}
          dir="ltr"
          onChange={(event) => {
            const next = event.target.value;
            if (parseFlexibleDate(next) === null) {
              return;
            }
            setIso(next);
            setText(formatFullDate(next));
            if (next !== defaultIso) {
              onCommit?.(next);
            }
          }}
          className="min-h-11 rounded-md border border-input bg-surface px-2 text-base text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        />
      </div>
    </div>
  );
}
