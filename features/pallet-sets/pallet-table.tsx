import type { ReactNode } from "react";

import { formatGramsAsKilograms } from "@/lib/kilograms";
import type { PalletDetail } from "@/lib/services/pallet-set-input";

import { RemovePalletButton } from "./remove-pallet-button";
import { totalTareGrams } from "./tare";

const headerClassName =
  "sticky top-0 border-b border-border bg-surface px-3 py-2 text-start font-medium text-foreground";
const cellClassName = "border-b border-border px-3 py-2 text-start align-top text-foreground";

export function PalletTable({
  pallets,
  setId,
  revision,
  canRemove,
}: {
  pallets: PalletDetail[];
  setId: string;
  revision: number;
  canRemove: boolean;
}): ReactNode {
  if (pallets.length === 0) {
    return <p className="text-base leading-normal text-muted">אין משטחים בסט זה.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface">
      <table className="w-full min-w-[48rem] border-collapse text-base">
        <thead>
          <tr>
            <th scope="col" className={headerClassName}>
              מספר
            </th>
            <th scope="col" className={headerClassName}>
              יבול
            </th>
            <th scope="col" className={headerClassName}>
              אריזה
            </th>
            <th scope="col" className={headerClassName}>
              סוג משטח
            </th>
            <th scope="col" className={headerClassName}>
              כמות
            </th>
            <th scope="col" className={headerClassName}>
              ברוטו (ק״ג)
            </th>
            <th scope="col" className={headerClassName}>
              טרה (ק״ג)
            </th>
            <th scope="col" className={headerClassName}>
              נטו (ק״ג)
            </th>
            {canRemove ? (
              <th scope="col" className={headerClassName}>
                הסרה
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {pallets.map((pallet) => (
            <tr id={`pallet-${pallet.id}`} key={pallet.id} className="scroll-mt-24">
              <td className={cellClassName}>
                <NumberText value={pallet.palletNumber} />
              </td>
              <td className={`${cellClassName} break-words`}>{pallet.yieldTypeName}</td>
              <td className={`${cellClassName} break-words`}>{pallet.packageTypeName}</td>
              <td className={`${cellClassName} break-words`}>{pallet.palletTypeName}</td>
              <td className={cellClassName}>
                <NumberText value={pallet.packageAmount} />
              </td>
              <td className={cellClassName}>
                <NumberText value={formatGramsAsKilograms(pallet.grossWeightGrams)} />
              </td>
              <td className={cellClassName}>
                <NumberText
                  value={formatGramsAsKilograms(
                    totalTareGrams(
                      pallet.packageTareGrams,
                      pallet.packageAmount,
                      pallet.palletTareGrams,
                    ),
                  )}
                />
              </td>
              <td className={cellClassName}>
                <NumberText value={formatGramsAsKilograms(pallet.netWeightGrams)} />
              </td>
              {canRemove ? (
                <td className={cellClassName}>
                  <RemovePalletButton
                    setId={setId}
                    revision={revision}
                    palletId={pallet.id}
                    palletNumber={pallet.palletNumber}
                  />
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function NumberText({ value }: { value: number | string }): ReactNode {
  return (
    <bdi dir="ltr" className="tabular-nums">
      {value}
    </bdi>
  );
}
