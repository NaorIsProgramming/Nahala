import { describe, expect, it } from "vitest";

import { formatHistoryAt, presentHistoryEvent, type HistoryPart } from "./present-history";

const palletId = "11111111-1111-4111-8111-111111111111";

function lineText(line: HistoryPart[]): string {
  return line.map((part) => part.value).join("");
}

describe("history presentation", () => {
  it("formats the event time in Jerusalem", () => {
    expect(formatHistoryAt(new Date("2026-11-07T10:00:00.000Z"))).toContain("12:00");
    expect(formatHistoryAt(new Date("2026-11-07T10:00:00.000Z"))).toContain("07");
  });

  it("shows a removed pallet's id, number, and weights on one line", () => {
    const presented = presentHistoryEvent({
      id: "event",
      at: new Date("2026-11-07T10:00:00.000Z"),
      action: "updated",
      summary: {
        removed: [
          {
            id: palletId,
            palletNumber: 41,
            yieldTypeId: "yield",
            packageTypeId: "package",
            palletTypeId: "pallet-type",
            packageAmount: 10,
            grossWeightGrams: 8_000,
            packageTareGrams: 100,
            palletTareGrams: 500,
            netWeightGrams: 6_500,
          },
        ],
      },
    });

    expect(presented.actionLabel).toBe("עודכן");
    const text = presented.lines.map(lineText).join("\n");
    expect(text).toContain(palletId);
    expect(text).toContain("41");
    expect(text).toContain("8");
    expect(text).toContain("6.5");
    expect(text).toContain("0.1");
    expect(text).toContain("0.5");
    expect(presented.lines[0]?.some((part) => part.kind === "ltr" && part.value === palletId)).toBe(
      true,
    );
  });

  it("shows one tare change, including a cleared tare", () => {
    const presented = presentHistoryEvent({
      id: "event",
      at: new Date("2026-11-07T10:00:00.000Z"),
      action: "tare_changed",
      summary: { tareGrams: { from: 100, to: null } },
    });

    expect(presented.actionLabel).toBe("טרה שונתה");
    expect(presented.lines).toHaveLength(1);
    expect(lineText(presented.lines[0] ?? [])).toBe("טרה מ־0.1 ק״ג ל־ללא");
  });

  it("does not dump a summary the reader cannot parse", () => {
    const presented = presentHistoryEvent({
      id: "event",
      at: new Date("2026-11-07T10:00:00.000Z"),
      action: "updated",
      summary: { removed: "not-a-pallet" },
    });

    expect(lineText(presented.lines[0] ?? [])).toBe("לא ניתן להציג את פירוט האירוע");
  });
});
