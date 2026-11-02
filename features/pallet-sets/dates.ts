/** List column: day and month. The year stays in the filter and on the detail page. */
export function formatDayMonth(isoDate: string): string {
  const parts = calendarParts(isoDate);
  if (!parts) {
    return isoDate;
  }
  return `${parts.day}.${parts.month}`;
}

export function formatFullDate(isoDate: string): string {
  const parts = calendarParts(isoDate);
  if (!parts) {
    return isoDate;
  }
  return `${parts.day}.${parts.month}.${parts.year}`;
}

/**
 * Accepts a calendar date, `01012004`, `020526`, `0205`, or day/month/year
 * separated by `/`, `.`, or `-`. Four digits use the current year.
 */
export function parseFlexibleDate(input: string, now: Date = new Date()): string | null {
  const trimmed = input.trim();
  if (trimmed.length === 0) {
    return null;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return toIso(Number(trimmed.slice(0, 4)), Number(trimmed.slice(5, 7)), Number(trimmed.slice(8, 10)));
  }

  const currentYear = Number(todayInJerusalem(now).slice(0, 4));
  const separated = trimmed.split(/[./-]/).filter((part) => part.length > 0);
  if (separated.length === 2 || separated.length === 3) {
    const day = Number(separated[0]);
    const month = Number(separated[1]);
    const year = separated.length === 3 ? expandYear(separated[2] ?? "") : currentYear;
    return toIso(year, month, day);
  }

  if (/^\d{8}$/.test(trimmed)) {
    return toIso(Number(trimmed.slice(4)), Number(trimmed.slice(2, 4)), Number(trimmed.slice(0, 2)));
  }
  if (/^\d{6}$/.test(trimmed)) {
    return toIso(2000 + Number(trimmed.slice(4)), Number(trimmed.slice(2, 4)), Number(trimmed.slice(0, 2)));
  }
  if (/^\d{4}$/.test(trimmed)) {
    return toIso(currentYear, Number(trimmed.slice(2)), Number(trimmed.slice(0, 2)));
  }
  return null;
}

function expandYear(value: string): number {
  if (/^\d{4}$/.test(value)) {
    return Number(value);
  }
  if (/^\d{2}$/.test(value)) {
    return 2000 + Number(value);
  }
  return Number.NaN;
}

function toIso(year: number, month: number, day: number): string | null {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return null;
  }
  if (year < 1900 || year > 2100) {
    return null;
  }
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function todayInJerusalem(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jerusalem",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function calendarParts(
  isoDate: string,
): { year: string; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) {
    return null;
  }
  const year = match[1];
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year === undefined || !Number.isInteger(month) || !Number.isInteger(day)) {
    return null;
  }
  return { year, month, day };
}
