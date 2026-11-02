import { Ban } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { PALLET_KIND_LABELS } from "@/lib/pallet-sets/kinds";
import type { PalletSetSummary } from "@/lib/services/pallet-set-input";

import { formatDayMonth } from "./dates";

const headerClassName =
  "sticky top-0 border-b border-border bg-surface px-3 py-2 text-start font-medium text-foreground";
const cellClassName = "border-b border-border px-3 py-2 text-start text-foreground";

export function SetTable({
  sets,
  showVoided,
}: {
  sets: PalletSetSummary[];
  showVoided: boolean;
}): ReactNode {
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface">
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
          {sets.map((set) => (
            <tr key={set.id}>
              <td className={cellClassName}>
                <Link
                  href={`/app/pallet-sets/${set.id}`}
                  className="font-medium text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  <bdi dir="ltr" className="tabular-nums">
                    {set.referenceNumber}
                  </bdi>
                </Link>
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
          ))}
        </tbody>
      </table>
    </div>
  );
}
