import { describe, expect, it } from "vitest";

import {
  addUtcDays,
  formatDayMonth,
  formatFullDate,
  monthGrid,
  parseFlexibleDate,
  shiftMonth,
  todayInJerusalem,
} from "./dates";

describe("pallet set dates", () => {
  it("shows the day and month on the list and the year on the detail", () => {
    expect(formatDayMonth("2026-11-02")).toBe("2.11");
    expect(formatFullDate("2026-11-02")).toBe("2.11.2026");
    expect(formatDayMonth("not-a-date")).toBe("not-a-date");
  });

  it("guesses a typed day and month", () => {
    expect(parseFlexibleDate("01012004")).toBe("2004-01-01");
    expect(parseFlexibleDate("020526")).toBe("2026-05-02");
    expect(parseFlexibleDate("0205", new Date("2026-11-02T12:00:00.000Z"))).toBe("2026-05-02");
    expect(parseFlexibleDate("2/5/2026")).toBe("2026-05-02");
    expect(parseFlexibleDate("31.02.2026")).toBeNull();
    expect(parseFlexibleDate("not-a-date")).toBeNull();
  });

  it("lays a month out from Sunday and steps between days", () => {
    const cells = monthGrid(2026, 11);
    const firstWeekday = new Date(Date.UTC(2026, 10, 1)).getUTCDay();
    expect(cells.filter((day) => day !== null)).toHaveLength(30);
    expect(cells.length % 7).toBe(0);
    expect(cells.slice(0, firstWeekday).every((cell) => cell === null)).toBe(true);
    expect(cells[firstWeekday]).toBe(1);
    expect(shiftMonth(2026, 1, -1)).toEqual({ year: 2025, month: 12 });
    expect(shiftMonth(2026, 12, 1)).toEqual({ year: 2027, month: 1 });
    expect(addUtcDays("2026-11-02", 1)).toBe("2026-11-03");
    expect(addUtcDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addUtcDays("1900-01-01", -1)).toBeNull();
  });

  it("uses the Jerusalem calendar day", () => {
    expect(todayInJerusalem(new Date("2026-11-01T22:30:00.000Z"))).toBe("2026-11-02");
    expect(todayInJerusalem(new Date("2026-11-02T21:30:00.000Z"))).toBe("2026-11-02");
    expect(todayInJerusalem(new Date("2026-11-02T22:30:00.000Z"))).toBe("2026-11-03");
  });
});
