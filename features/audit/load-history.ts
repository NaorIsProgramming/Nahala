"use server";

import { z } from "zod";

import { AUDIT_SUBJECT_TYPES } from "@/db/schema/audit";
import { presentHistoryEvent, type PresentedEvent } from "@/lib/audit/present-history";
import { getActor } from "@/lib/access";
import { listSubjectHistory } from "@/lib/services/audit";

export type HistoryActionResult =
  | { status: "signed-out"; message: string }
  | { status: "error"; message: string }
  | { status: "ready"; events: PresentedEvent[]; truncated: boolean };

const SIGNED_OUT_MESSAGE = "יש להתחבר מחדש";
const LOAD_FAILED_MESSAGE = "לא הצלחנו לטעון את ההיסטוריה. נסו שוב.";

const historyRequestSchema = z.object({
  subjectType: z.enum(AUDIT_SUBJECT_TYPES),
  subjectId: z.uuid(),
});

export async function loadHistoryAction(input: unknown): Promise<HistoryActionResult> {
  const actor = await getActor();
  if (!actor) {
    return { status: "signed-out", message: SIGNED_OUT_MESSAGE };
  }

  const parsed = historyRequestSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: "הרשומה לא נמצאה" };
  }

  try {
    const result = await listSubjectHistory(
      actor,
      parsed.data.subjectType,
      parsed.data.subjectId,
    );
    if (!result.ok) {
      return { status: "error", message: result.message };
    }
    return {
      status: "ready",
      truncated: result.data.truncated,
      events: result.data.events.map((event) => presentHistoryEvent(event)),
    };
  } catch {
    console.error("history read failed");
    return { status: "error", message: LOAD_FAILED_MESSAGE };
  }
}
