"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { formatGramsAsKilograms } from "@/lib/kilograms";
import { PALLET_KIND_LABELS } from "@/lib/pallet-sets/kinds";
import type { PalletKind } from "@/lib/access-types";

import { totalTareGrams } from "./tare";
import { VoidSetForm } from "./void-set-form";

type GlancePallet = {
  id: string;
  palletNumber: number;
  yieldTypeName: string;
  packageTypeName: string;
  palletTypeName: string;
  packageAmount: number;
  grossWeightGrams: number;
  packageTareGrams: number;
  palletTareGrams: number;
  netWeightGrams: number;
};

const headerClassName =
  "sticky top-0 border-b border-border bg-surface px-3 py-2 text-start font-medium text-foreground";
const cellClassName = "border-b border-border px-3 py-2 text-start text-foreground";

export function SetGlance({
  setId,
  revision,
  referenceNumber,
  kind,
  growerName,
  voided,
  canVoid,
  pallets,
}: {
  setId: string;
  revision: number;
  referenceNumber: number;
  kind: PalletKind;
  growerName: string;
  voided: boolean;
  canVoid: boolean;
  pallets: GlancePallet[];
}): ReactNode {
  return (
    <aside
      data-set-glance=""
      className="fixed inset-x-0 bottom-0 z-20 max-h-[45vh] overflow-y-auto border-t border-border bg-surface px-4 py-3"
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-baseline gap-3">
            <p className="text-base font-medium text-foreground">
              אסמכתא{" "}
              <bdi dir="ltr" className="tabular-nums">
                {referenceNumber}
              </bdi>
            </p>
            <p className="text-base text-foreground">{PALLET_KIND_LABELS[kind]}</p>
            <p className="text-base text-foreground">{growerName}</p>
            {voided ? <p className="text-base text-foreground">מבוטל</p> : null}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={`/app/pallet-sets/${setId}`}
              className="inline-flex min-h-11 items-center text-base font-medium text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              כניסה לסט
            </Link>
            {canVoid ? <VoidSetForm id={setId} revision={revision} /> : null}
          </div>
        </div>
        {pallets.length === 0 ? (
          <p className="text-base leading-normal text-muted">אין משטחים בסט זה.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[48rem] border-collapse text-base">
              <thead>
                <tr>
                  <th scope="col" className={headerClassName}>מספר</th>
                  <th scope="col" className={headerClassName}>יבול</th>
                  <th scope="col" className={headerClassName}>אריזה</th>
                  <th scope="col" className={headerClassName}>סוג משטח</th>
                  <th scope="col" className={headerClassName}>כמות</th>
                  <th scope="col" className={headerClassName}>ברוטו (ק״ג)</th>
                  <th scope="col" className={headerClassName}>טרה (ק״ג)</th>
                  <th scope="col" className={headerClassName}>נטו (ק״ג)</th>
                </tr>
              </thead>
              <tbody>
                {pallets.map((pallet) => (
                  <tr id={`glance-pallet-${pallet.id}`} key={pallet.id}>
                    <td className={cellClassName}>
                      <Link
                        href={`/app/pallet-sets/${setId}#pallet-${pallet.id}`}
                        onClick={() => {
                          document
                            .getElementById(`glance-pallet-${pallet.id}`)
                            ?.scrollIntoView({ block: "nearest" });
                        }}
                        className="font-medium text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                      >
                        <bdi dir="ltr" className="tabular-nums">
                          {pallet.palletNumber}
                        </bdi>
                      </Link>
                    </td>
                    <td className={`${cellClassName} break-words`}>{pallet.yieldTypeName}</td>
                    <td className={`${cellClassName} break-words`}>{pallet.packageTypeName}</td>
                    <td className={`${cellClassName} break-words`}>{pallet.palletTypeName}</td>
                    <td className={cellClassName}>
                      <bdi dir="ltr" className="tabular-nums">
                        {pallet.packageAmount}
                      </bdi>
                    </td>
                    <td className={cellClassName}>
                      <bdi dir="ltr" className="tabular-nums">
                        {formatGramsAsKilograms(pallet.grossWeightGrams)}
                      </bdi>
                    </td>
                    <td className={cellClassName}>
                      <bdi dir="ltr" className="tabular-nums">
                        {formatGramsAsKilograms(
                          totalTareGrams(
                            pallet.packageTareGrams,
                            pallet.packageAmount,
                            pallet.palletTareGrams,
                          ),
                        )}
                      </bdi>
                    </td>
                    <td className={cellClassName}>
                      <bdi dir="ltr" className="tabular-nums">
                        {formatGramsAsKilograms(pallet.netWeightGrams)}
                      </bdi>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </aside>
  );
}
