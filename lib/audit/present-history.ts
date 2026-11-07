import { AUDIT_ACTIONS, type AuditAction } from "@/db/schema/audit";
import { isPalletKind } from "@/lib/access-types";
import { formatGramsAsKilograms } from "@/lib/kilograms";
import { PALLET_KIND_LABELS } from "@/lib/pallet-sets/kinds";

import { readAuditSummary, type AuditPalletSnapshot, type AuditSummary } from "./summary";

export type HistoryPart = { kind: "text"; value: string } | { kind: "ltr"; value: string };

export type PresentedEvent = {
  id: string;
  atLabel: string;
  actionLabel: string;
  lines: HistoryPart[][];
};

const ACTION_LABELS = {
  created: "נוצר",
  updated: "עודכן",
  voided: "בוטל",
  tare_changed: "טרה שונתה",
} as const satisfies Record<AuditAction, string>;

const UNREADABLE = "לא ניתן להציג את פירוט האירוע";

export function presentHistoryEvent(event: {
  id: string;
  at: Date;
  action: string;
  summary: unknown;
}): PresentedEvent {
  const summary = readAuditSummary(event.summary);
  return {
    id: event.id,
    atLabel: formatHistoryAt(event.at),
    actionLabel: isAuditAction(event.action) ? ACTION_LABELS[event.action] : "אירוע",
    lines: summary === null ? [[{ kind: "text", value: UNREADABLE }]] : summaryLines(summary),
  };
}

export function formatHistoryAt(at: Date): string {
  return new Intl.DateTimeFormat("he-IL", {
    timeZone: "Asia/Jerusalem",
    numberingSystem: "latn",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(at);
}

function isAuditAction(value: string): value is AuditAction {
  return AUDIT_ACTIONS.some((action) => action === value);
}

function summaryLines(summary: AuditSummary): HistoryPart[][] {
  const lines: HistoryPart[][] = [];
  if (summary.createdHeader) {
    lines.push(labeled("סוג", [kindPart(summary.createdHeader.kind)]));
    lines.push(labeled("אסמכתא", [numberPart(summary.createdHeader.referenceNumber)]));
    lines.push(labeled("מגדל", [ltr(summary.createdHeader.growerId)]));
    lines.push(labeled("תאריך", [calendarPart(summary.createdHeader.receivedOn)]));
  }
  if (summary.header) {
    pushHeaderChanges(lines, summary.header);
  }
  for (const pallet of summary.added ?? []) {
    lines.push(palletLine("נוסף משטח", pallet));
  }
  for (const pallet of summary.changed ?? []) {
    lines.push(labeled("משטח", [ltr(pallet.id)]));
    pushPalletFieldChanges(lines, pallet.fields);
  }
  for (const pallet of summary.removed ?? []) {
    lines.push(palletLine("הוסר משטח", pallet));
  }
  if (summary.voided?.to === true) {
    lines.push([{ kind: "text", value: "הסט סומן כמבוטל" }]);
  }
  if (summary.tareGrams) {
    lines.push(
      changeLine("טרה", tareParts(summary.tareGrams.from), tareParts(summary.tareGrams.to)),
    );
  }
  return lines;
}

function pushHeaderChanges(
  lines: HistoryPart[][],
  header: NonNullable<AuditSummary["header"]>,
): void {
  if (header.kind) {
    lines.push(changeLine("סוג", [kindPart(header.kind.from)], [kindPart(header.kind.to)]));
  }
  if (header.referenceNumber) {
    lines.push(
      changeLine(
        "אסמכתא",
        [numberPart(header.referenceNumber.from)],
        [numberPart(header.referenceNumber.to)],
      ),
    );
  }
  if (header.growerId) {
    lines.push(changeLine("מגדל", [ltr(header.growerId.from)], [ltr(header.growerId.to)]));
  }
  if (header.receivedOn) {
    lines.push(
      changeLine(
        "תאריך",
        [calendarPart(header.receivedOn.from)],
        [calendarPart(header.receivedOn.to)],
      ),
    );
  }
}

function pushPalletFieldChanges(
  lines: HistoryPart[][],
  fields: NonNullable<AuditSummary["changed"]>[number]["fields"],
): void {
  if (fields.palletNumber) {
    lines.push(
      changeLine(
        "מספר",
        [numberPart(fields.palletNumber.from)],
        [numberPart(fields.palletNumber.to)],
      ),
    );
  }
  if (fields.yieldTypeId) {
    lines.push(changeLine("סוג יבול", [ltr(fields.yieldTypeId.from)], [ltr(fields.yieldTypeId.to)]));
  }
  if (fields.packageTypeId) {
    lines.push(
      changeLine("סוג אריזה", [ltr(fields.packageTypeId.from)], [ltr(fields.packageTypeId.to)]),
    );
  }
  if (fields.palletTypeId) {
    lines.push(
      changeLine("סוג משטח", [ltr(fields.palletTypeId.from)], [ltr(fields.palletTypeId.to)]),
    );
  }
  if (fields.packageAmount) {
    lines.push(
      changeLine(
        "כמות",
        [numberPart(fields.packageAmount.from)],
        [numberPart(fields.packageAmount.to)],
      ),
    );
  }
  pushWeightChange(lines, "ברוטו", fields.grossWeightGrams);
  pushWeightChange(lines, "טרת אריזה", fields.packageTareGrams);
  pushWeightChange(lines, "טרת משטח", fields.palletTareGrams);
  pushWeightChange(lines, "נטו", fields.netWeightGrams);
}

function pushWeightChange(
  lines: HistoryPart[][],
  label: string,
  change: { from: number; to: number } | undefined,
): void {
  if (!change) {
    return;
  }
  lines.push(changeLine(label, kilogramsParts(change.from), kilogramsParts(change.to)));
}

function palletLine(prefix: string, pallet: AuditPalletSnapshot): HistoryPart[] {
  return [
    { kind: "text", value: `${prefix} ` },
    ltr(pallet.id),
    { kind: "text", value: ", מספר " },
    numberPart(pallet.palletNumber),
    { kind: "text", value: ", כמות " },
    numberPart(pallet.packageAmount),
    { kind: "text", value: ", ברוטו " },
    ...kilogramsParts(pallet.grossWeightGrams),
    { kind: "text", value: ", נטו " },
    ...kilogramsParts(pallet.netWeightGrams),
    { kind: "text", value: ", טרת אריזה " },
    ...kilogramsParts(pallet.packageTareGrams),
    { kind: "text", value: ", טרת משטח " },
    ...kilogramsParts(pallet.palletTareGrams),
  ];
}

function labeled(label: string, value: HistoryPart[]): HistoryPart[] {
  return [{ kind: "text", value: `${label} ` }, ...value];
}

function changeLine(label: string, from: HistoryPart[], to: HistoryPart[]): HistoryPart[] {
  return [
    { kind: "text", value: `${label} מ־` },
    ...from,
    { kind: "text", value: " ל־" },
    ...to,
  ];
}

function kindPart(value: string): HistoryPart {
  if (isPalletKind(value)) {
    return { kind: "text", value: PALLET_KIND_LABELS[value] };
  }
  return ltr(value);
}

function calendarPart(value: string): HistoryPart {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return ltr(value);
  }
  const year = match[1];
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year === undefined || !Number.isInteger(month) || !Number.isInteger(day)) {
    return ltr(value);
  }
  return ltr(`${day}.${month}.${year}`);
}

function numberPart(value: number): HistoryPart {
  return Number.isSafeInteger(value)
    ? ltr(String(value))
    : { kind: "text", value: "ערך לא קריא" };
}

function kilogramsParts(grams: number): HistoryPart[] {
  if (!Number.isSafeInteger(grams)) {
    return [{ kind: "text", value: "ערך לא קריא" }];
  }
  return [ltr(formatGramsAsKilograms(grams)), { kind: "text", value: " ק״ג" }];
}

function tareParts(grams: number | null): HistoryPart[] {
  if (grams === null) {
    return [{ kind: "text", value: "ללא" }];
  }
  return kilogramsParts(grams);
}

function ltr(value: string): HistoryPart {
  return { kind: "ltr", value };
}
