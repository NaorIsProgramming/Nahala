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
