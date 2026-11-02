"use client";

import { Ban } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";

import { PALLET_KIND_LABELS } from "@/lib/pallet-sets/kinds";
import type { PalletKind } from "@/lib/access-types";

import { formatDayMonth } from "./dates";

type SetRow = {
  id: string;
  kind: PalletKind;
  referenceNumber: number;
  growerName: string;
  receivedOn: string;
};

const headerClassName =
  "sticky top-0 border-b border-border bg-surface px-3 py-2 text-start font-medium text-foreground";
const cellClassName = "border-b border-border px-3 py-2 text-start text-foreground";

export function SelectableSetTable({
  sets,
  selectedId,
  showVoided,
  filterPath,
}: {
  sets: SetRow[];
  selectedId?: string;
  showVoided: boolean;
  filterPath: string;
}): ReactNode {
  const router = useRouter();
  const [activeId, setActiveId] = useState(selectedId);
  const [seenSelected, setSeenSelected] = useState(selectedId);
  if (selectedId !== seenSelected) {
    setSeenSelected(selectedId);
    setActiveId(selectedId);
  }

  function select(id: string): void {
    setActiveId(id);
    const [pathname, query = ""] = filterPath.split("?");
    const search = new URLSearchParams(query);
    search.set("selected", id);
    const next = search.toString();
    router.replace(next.length === 0 ? (pathname ?? filterPath) : `${pathname}?${next}`, {
      scroll: false,
    });
  }

  function move(direction: 1 | -1): void {
    if (sets.length === 0) {
      return;
    }
    const index = sets.findIndex((set) => set.id === activeId);
    const nextIndex = index < 0 ? 0 : (index + direction + sets.length) % sets.length;
    const next = sets[nextIndex];
    if (next) {
      select(next.id);
    }
  }

  return (
    <div
      tabIndex={0}
      className="overflow-x-auto rounded-lg border border-border bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      onKeyDown={(event) => {
        if (event.key === "ArrowDown") {
          event.preventDefault();
          move(1);
        }
        if (event.key === "ArrowUp") {
          event.preventDefault();
          move(-1);
        }
      }}
    >
      <table className="w-full min-w-[40rem] border-collapse text-base">
        <thead>
          <tr>
            <th scope="col" className={headerClassName}>
              אסמכתא
            </th>
            <th scope="col" className={headerClassName}>
              סוג
            </th>
            <th scope="col" className={headerClassName}>
              מגדל
            </th>
            <th scope="col" className={headerClassName}>
              תאריך
            </th>
            {showVoided ? (
              <th scope="col" className={headerClassName}>
                מצב
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {sets.map((set) => {
            const selected = set.id === (activeId ?? selectedId);
            return (
              <tr
                key={set.id}
                className={selected ? "cursor-pointer bg-background" : "cursor-pointer"}
                onClick={() => {
                  select(set.id);
                }}
              >
                <td className={cellClassName}>
                  <button
                    type="button"
                    aria-pressed={selected}
                    onClick={() => {
                      select(set.id);
                    }}
                    className="font-medium text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    <bdi dir="ltr" className="tabular-nums">
                      {set.referenceNumber}
                    </bdi>
                  </button>
                </td>
                <td className={cellClassName}>{PALLET_KIND_LABELS[set.kind]}</td>
                <td className={`${cellClassName} break-words`}>{set.growerName}</td>
                <td className={cellClassName}>
                  <bdi dir="ltr" className="tabular-nums">
                    {formatDayMonth(set.receivedOn)}
                  </bdi>
                </td>
                {showVoided ? (
                  <td className={cellClassName}>
                    <span className="inline-flex items-center gap-2">
                      <Ban aria-hidden="true" className="size-5 shrink-0" strokeWidth={2} />
                      מבוטל
                    </span>
                  </td>
                ) : null}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
