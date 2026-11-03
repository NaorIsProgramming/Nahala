"use client";

import { Calendar } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";

import { fieldClassName } from "./classes";
import { formatFullDate, parseFlexibleDate } from "./dates";
import { MonthCalendar } from "./month-calendar";

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
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  function select(nextIso: string): void {
    setIso(nextIso);
    setText(formatFullDate(nextIso));
    setIsOpen(false);
    if (nextIso !== defaultIso) {
      onCommit?.(nextIso);
    }
    inputRef.current?.focus();
  }

  useLayoutEffect(() => {
    if (!isOpen) {
      return;
    }

    function place(): void {
      const anchor = rootRef.current;
      const popup = popupRef.current;
      if (!anchor || !popup) {
        return;
      }
      const rect = anchor.getBoundingClientRect();
      const margin = 8;
      let left = rect.left;
      if (left + popup.offsetWidth > window.innerWidth - margin) {
        left = Math.max(margin, window.innerWidth - popup.offsetWidth - margin);
      }
      let top = rect.bottom + margin;
      if (top + popup.offsetHeight > window.innerHeight - margin) {
        top = Math.max(margin, rect.top - popup.offsetHeight - margin);
      }
      setPosition((current) =>
        current?.top === top && current.left === left ? current : { top, left },
      );
    }

    place();
    const popup = popupRef.current;
    const observer = popup ? new ResizeObserver(place) : null;
    if (popup && observer) {
      observer.observe(popup);
    }
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent): void {
      if (!(event.target instanceof Node)) {
        return;
      }
      if (rootRef.current?.contains(event.target) || popupRef.current?.contains(event.target)) {
        return;
      }
      setIsOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        setIsOpen(false);
        inputRef.current?.focus();
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
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-base font-medium text-foreground">
        {label}
      </label>
      <input type="hidden" name={name} value={iso} />
      <div ref={rootRef} dir="ltr" className="relative w-48">
        <input
          ref={inputRef}
          id={id}
          value={text}
          required={required}
          disabled={disabled}
          autoComplete="off"
          inputMode="numeric"
          dir="ltr"
          placeholder="dd.mm.yyyy"
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
          className={cn(fieldClassName, "w-48 pe-11 tabular-nums placeholder:text-muted")}
        />
        <button
          type="button"
          aria-label={`לוח חודש, ${label}`}
          aria-expanded={isOpen}
          disabled={disabled}
          onClick={() => {
            commit(text);
            setPosition(null);
            setIsOpen((current) => !current);
          }}
          className="absolute inset-y-0 end-0 inline-flex w-11 items-center justify-center rounded-e-md text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"
        >
          <Calendar aria-hidden="true" className="size-5" strokeWidth={2} />
        </button>
      </div>
      {isOpen
        ? createPortal(
            <div
              className="fixed z-40"
              style={{
                top: position?.top ?? 0,
                left: position?.left ?? 0,
                visibility: position ? "visible" : "hidden",
              }}
            >
              <MonthCalendar selectedIso={iso} popupRef={popupRef} onSelect={select} />
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
