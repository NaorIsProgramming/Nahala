"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useId, useState, type ReactNode, type RefObject } from "react";

import { cn } from "@/lib/utils";

import { addUtcDays, monthGrid, shiftMonth, todayInJerusalem } from "./dates";

const MONTH_NAMES = [
  "ינואר",
  "פברואר",
  "מרץ",
  "אפריל",
  "מאי",
  "יוני",
  "יולי",
  "אוגוסט",
  "ספטמבר",
  "אוקטובר",
  "נובמבר",
  "דצמבר",
] as const;

const WEEKDAYS = ["א", "ב", "ג", "ד", "ה", "ו", "ש"] as const;

type MonthCalendarProps = {
  selectedIso: string;
  popupRef: RefObject<HTMLDivElement | null>;
  onSelect: (isoDate: string) => void;
};

export function MonthCalendar({
  selectedIso,
  popupRef,
  onSelect,
}: MonthCalendarProps): ReactNode {
  const labelId = useId();
  const today = todayInJerusalem();
  const initial = selectedIso.length > 0 ? selectedIso : today;
  const [year, setYear] = useState(Number(initial.slice(0, 4)));
  const [month, setMonth] = useState(Number(initial.slice(5, 7)));
  const [focusIso, setFocusIso] = useState(initial);

  useEffect(() => {
    const button = popupRef.current?.querySelector<HTMLButtonElement>(`[data-iso="${focusIso}"]`);
    button?.focus();
  }, [focusIso, popupRef]);

  function show(nextYear: number, nextMonth: number): void {
    if (nextYear < 1900 || nextYear > 2100) {
      return;
    }
    setYear(nextYear);
    setMonth(nextMonth);
  }

  function showKeepingDay(nextYear: number, nextMonth: number): void {
    if (nextYear < 1900 || nextYear > 2100) {
      return;
    }
    const wantedDay = Number(focusIso.slice(8, 10));
    const lastDay = new Date(Date.UTC(nextYear, nextMonth, 0)).getUTCDate();
    const day = Math.min(Number.isInteger(wantedDay) && wantedDay > 0 ? wantedDay : 1, lastDay);
    const iso = `${String(nextYear).padStart(4, "0")}-${String(nextMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    setYear(nextYear);
    setMonth(nextMonth);
    setFocusIso(iso);
  }

  function moveFocus(days: number): void {
    const next = addUtcDays(focusIso, days);
    if (!next) {
      return;
    }
    setFocusIso(next);
    show(Number(next.slice(0, 4)), Number(next.slice(5, 7)));
  }

  const monthName = MONTH_NAMES[month - 1] ?? "";
  const cells = monthGrid(year, month);
  const focusIsVisible = focusIso.startsWith(
    `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-`,
  );
  const visibleFocusIso = focusIsVisible
    ? focusIso
    : `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-01`;
  const previous = shiftMonth(year, month, -1);
  const next = shiftMonth(year, month, 1);

  return (
    <div
      ref={popupRef}
      role="dialog"
      aria-modal="false"
      aria-labelledby={labelId}
      dir="rtl"
      className="w-max rounded-lg border border-border bg-surface p-3"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <button
          type="button"
          aria-label="חודש קודם"
          disabled={previous.year < 1900}
          onClick={() => {
            showKeepingDay(previous.year, previous.month);
          }}
          className="inline-flex size-11 items-center justify-center rounded-md text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"
        >
          <ChevronRight aria-hidden="true" className="size-5" strokeWidth={2} />
        </button>
        <p id={labelId} className="text-base font-medium text-foreground">
          {monthName} <bdi className="tabular-nums">{year}</bdi>
        </p>
        <button
          type="button"
          aria-label="חודש הבא"
          disabled={next.year > 2100}
          onClick={() => {
            showKeepingDay(next.year, next.month);
          }}
          className="inline-flex size-11 items-center justify-center rounded-md text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"
        >
          <ChevronLeft aria-hidden="true" className="size-5" strokeWidth={2} />
        </button>
      </div>
      <div className="grid grid-cols-7">
        {WEEKDAYS.map((weekday) => (
          <div
            key={weekday}
            className="flex h-11 items-center justify-center text-base text-muted"
          >
            {weekday}
          </div>
        ))}
        {cells.map((day, index) => {
          if (day === null) {
            return <div key={`empty-${index}`} />;
          }
          const iso = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const isSelected = iso === selectedIso;
          const isToday = iso === today;
          return (
            <button
              key={iso}
              type="button"
              data-iso={iso}
              tabIndex={iso === visibleFocusIso ? 0 : -1}
              aria-pressed={isSelected}
              aria-current={isToday ? "date" : undefined}
              aria-label={`${day} ב${monthName} ${year}`}
              onClick={() => {
                onSelect(iso);
              }}
              onKeyDown={(event) => {
                const step =
                  event.key === "ArrowLeft"
                    ? 1
                    : event.key === "ArrowRight"
                      ? -1
                      : event.key === "ArrowDown"
                        ? 7
                        : event.key === "ArrowUp"
                          ? -7
                          : 0;
                if (step === 0) {
                  return;
                }
                event.preventDefault();
                moveFocus(step);
              }}
              className={cn(
                "inline-flex size-11 items-center justify-center rounded-md text-base tabular-nums text-foreground",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                isSelected
                  ? "bg-primary font-medium text-primary-foreground"
                  : "hover:bg-background",
                isToday && !isSelected ? "border border-primary font-medium" : "",
              )}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
