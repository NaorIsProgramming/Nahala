"use client";

import { useId, useRef, useState, type ReactNode } from "react";

import type { AuditSubjectType } from "@/db/schema/audit";
import { HISTORY_LIMIT } from "@/lib/audit/history-limit";
import type { HistoryPart } from "@/lib/audit/present-history";

import { loadHistoryAction, type HistoryActionResult } from "./load-history";

type HistoryPanelProps = {
  subjectType: AuditSubjectType;
  subjectId: string;
  accessibleName: string;
};

type PanelState = { status: "idle" } | { status: "loading" } | HistoryActionResult;

const buttonClassName =
  "inline-flex min-h-11 items-center justify-center rounded-md border border-input bg-surface px-4 text-base font-medium text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60";

export function HistoryPanel({
  subjectType,
  subjectId,
  accessibleName,
}: HistoryPanelProps): ReactNode {
  const panelId = useId();
  const requestId = useRef(0);
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<PanelState>({ status: "idle" });

  async function handleToggle(): Promise<void> {
    if (open) {
      requestId.current += 1;
      setOpen(false);
      return;
    }

    const current = requestId.current + 1;
    requestId.current = current;
    setOpen(true);
    setState({ status: "loading" });
    try {
      const result = await loadHistoryAction({ subjectType, subjectId });
      if (requestId.current !== current) {
        return;
      }
      setState(result);
    } catch {
      if (requestId.current !== current) {
        return;
      }
      setState({ status: "error", message: "לא הצלחנו לטעון את ההיסטוריה. נסו שוב." });
    }
  }

  return (
    <div className="flex flex-col items-start gap-3">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={accessibleName}
        onClick={() => {
          void handleToggle();
        }}
        className={buttonClassName}
      >
        היסטוריה
      </button>
      {open ? (
        <div id={panelId} role="region" aria-label={accessibleName} className="w-full">
          <HistoryBody state={state} />
        </div>
      ) : null}
    </div>
  );
}

function HistoryBody({ state }: { state: PanelState }): ReactNode {
  if (state.status === "idle" || state.status === "loading") {
    return <p className="text-base leading-normal text-muted">טוען את ההיסטוריה</p>;
  }
  if (state.status === "signed-out" || state.status === "error") {
    return (
      <p role="alert" className="text-base leading-normal text-foreground">
        {state.message}
      </p>
    );
  }
  if (state.events.length === 0) {
    return <p className="text-base leading-normal text-muted">אין רשומות בהיסטוריה</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {state.truncated ? (
        <p className="text-base leading-normal text-muted">
          מוצגות{" "}
          <bdi dir="ltr" className="tabular-nums">
            {HISTORY_LIMIT}
          </bdi>{" "}
          הרשומות האחרונות
        </p>
      ) : null}
      <ol className="flex flex-col gap-4">
        {state.events.map((event) => (
          <li key={event.id} className="flex flex-col gap-1 border-b border-border pb-4 last:border-b-0">
            <p className="text-base font-medium text-foreground">
              <bdi dir="ltr" className="tabular-nums">
                {event.atLabel}
              </bdi>
              {" · "}
              {event.actionLabel}
            </p>
            {event.lines.map((line, index) => (
              <p key={`${event.id}-${index}`} className="text-base leading-normal text-foreground">
                <HistoryLine line={line} />
              </p>
            ))}
          </li>
        ))}
      </ol>
    </div>
  );
}

function HistoryLine({ line }: { line: HistoryPart[] }): ReactNode {
  return line.map((part, index) =>
    part.kind === "ltr" ? (
      <bdi key={index} dir="ltr" className="tabular-nums break-all">
        {part.value}
      </bdi>
    ) : (
      <span key={index}>{part.value}</span>
    ),
  );
}
