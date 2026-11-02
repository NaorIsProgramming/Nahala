import { sql, type SQL } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  foreignKey,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

import { PALLET_KINDS } from "@/lib/access-types";
import {
  RECOMMENDED_PACKAGE_AMOUNT_MAX,
  TARE_MAX_GRAMS,
} from "@/lib/reference-limits";

import { user } from "./auth";
import { growers, packageTypes, palletTypes, yieldTypes } from "./reference-data";
import { timestampColumns } from "./timestamps";

/** 100,000 kg. With the tare and package-amount caps, tare times amount stays inside a 32-bit integer. */
const GROSS_WEIGHT_MAX_GRAMS = 100_000_000;

function sqlStringList(values: readonly string[]): SQL {
  return sql.raw(
    values
      .map((value) => {
        if (!/^[A-Za-z0-9_]+$/.test(value)) {
          throw new Error("Refusing to embed an unsafe pallet literal");
        }
        return `'${value}'`;
      })
      .join(", "),
  );
}

function integerAtLeast(constraintName: string, column: AnyPgColumn, min: number) {
  return check(constraintName, sql`${column} >= ${sql.raw(String(min))}`);
}

function integerBetween(
  constraintName: string,
  column: AnyPgColumn,
  min: number,
  max: number,
) {
  return check(
    constraintName,
    sql`${column} >= ${sql.raw(String(min))} and ${column} <= ${sql.raw(String(max))}`,
  );
}

export const palletSets = pgTable(
  "pallet_sets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    kind: text("kind").notNull(),
    referenceNumber: integer("reference_number").notNull(),
    growerId: uuid("grower_id")
      .notNull()
      .references(() => growers.id, { onDelete: "restrict" }),
    receivedOn: date("received_on", { mode: "string" }).notNull(),
    voided: boolean("voided").default(false).notNull(),
    voidedAt: timestamp("voided_at", { withTimezone: true, mode: "date" }),
    voidedBy: text("voided_by").references(() => user.id, { onDelete: "restrict" }),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    updatedBy: text("updated_by")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    revision: integer("revision").default(1).notNull(),
    ...timestampColumns(),
  },
  (table) => [
    // Target for the pallet composite foreign key. id is already unique; the extra columns let a grower or void change cascade.
    unique("pallet_sets_id_grower_voided_key").on(table.id, table.growerId, table.voided),
    uniqueIndex("pallet_sets_active_reference_number_uidx")
      .on(table.referenceNumber)
      .where(sql`${table.voided} = false`),
    index("pallet_sets_active_received_on_id_idx")
      .on(table.receivedOn, table.id)
      .where(sql`${table.voided} = false`),
    index("pallet_sets_active_grower_received_on_idx")
      .on(table.growerId, table.receivedOn)
      .where(sql`${table.voided} = false`),
    index("pallet_sets_active_kind_received_on_idx")
      .on(table.kind, table.receivedOn)
      .where(sql`${table.voided} = false`),
    index("pallet_sets_voided_received_on_id_idx")
      .on(table.receivedOn, table.id)
      .where(sql`${table.voided} = true`),
    index("pallet_sets_grower_id_idx").on(table.growerId),
    index("pallet_sets_created_by_idx").on(table.createdBy),
    index("pallet_sets_updated_by_idx").on(table.updatedBy),
    index("pallet_sets_voided_by_idx").on(table.voidedBy),
    check("pallet_sets_kind_check", sql`${table.kind} in (${sqlStringList(PALLET_KINDS)})`),
    integerAtLeast("pallet_sets_reference_number_check", table.referenceNumber, 1),
    integerAtLeast("pallet_sets_revision_check", table.revision, 1),
  ],
);

function netWeightFormula(table: {
  grossWeightGrams: AnyPgColumn;
  packageTareGrams: AnyPgColumn;
  packageAmount: AnyPgColumn;
  palletTareGrams: AnyPgColumn;
}): SQL {
  return sql`${table.grossWeightGrams} - ${table.packageTareGrams} * ${table.packageAmount} - ${table.palletTareGrams}`;
}

export const pallets = pgTable(
  "pallets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    setId: uuid("set_id").notNull(),
    growerId: uuid("grower_id").notNull(),
    voided: boolean("voided").notNull(),
    palletNumber: integer("pallet_number").notNull(),
    yieldTypeId: uuid("yield_type_id")
      .notNull()
      .references(() => yieldTypes.id, { onDelete: "restrict" }),
    packageTypeId: uuid("package_type_id")
      .notNull()
      .references(() => packageTypes.id, { onDelete: "restrict" }),
    palletTypeId: uuid("pallet_type_id")
      .notNull()
      .references(() => palletTypes.id, { onDelete: "restrict" }),
    packageAmount: integer("package_amount").notNull(),
    grossWeightGrams: integer("gross_weight_grams").notNull(),
    packageTareGrams: integer("package_tare_grams").notNull(),
    palletTareGrams: integer("pallet_tare_grams").notNull(),
    netWeightGrams: integer("net_weight_grams").notNull(),
    ...timestampColumns(),
  },
  (table) => {
    const formula = netWeightFormula(table);
    return [
      foreignKey({
        name: "pallets_set_grower_voided_fk",
        columns: [table.setId, table.growerId, table.voided],
        foreignColumns: [palletSets.id, palletSets.growerId, palletSets.voided],
      })
        .onUpdate("cascade")
        .onDelete("restrict"),
      uniqueIndex("pallets_active_grower_pallet_number_uidx")
        .on(table.growerId, table.palletNumber)
        .where(sql`${table.voided} = false`),
      index("pallets_set_id_idx").on(table.setId),
      index("pallets_set_id_package_type_id_idx").on(table.setId, table.packageTypeId),
      index("pallets_set_id_yield_type_id_idx").on(table.setId, table.yieldTypeId),
      index("pallets_voided_package_type_id_idx")
        .on(table.packageTypeId)
        .where(sql`${table.voided}`),
      index("pallets_voided_pallet_type_id_idx")
        .on(table.palletTypeId)
        .where(sql`${table.voided}`),
      index("pallets_yield_type_id_idx").on(table.yieldTypeId),
      index("pallets_package_type_id_idx").on(table.packageTypeId),
      index("pallets_pallet_type_id_idx").on(table.palletTypeId),
      integerAtLeast("pallets_pallet_number_check", table.palletNumber, 1),
      integerBetween(
        "pallets_package_amount_check",
        table.packageAmount,
        1,
        RECOMMENDED_PACKAGE_AMOUNT_MAX,
      ),
      integerBetween(
        "pallets_gross_weight_grams_check",
        table.grossWeightGrams,
        0,
        GROSS_WEIGHT_MAX_GRAMS,
      ),
      integerBetween(
        "pallets_package_tare_grams_check",
        table.packageTareGrams,
        0,
        TARE_MAX_GRAMS,
      ),
      integerBetween(
        "pallets_pallet_tare_grams_check",
        table.palletTareGrams,
        0,
        TARE_MAX_GRAMS,
      ),
      // Active net must equal the formula, so a negative result cannot be stored. A voided row stores greatest(0, formula).
      check(
        "pallets_net_weight_grams_check",
        sql`${table.netWeightGrams} >= 0 and ((${table.voided} = false and ${table.netWeightGrams} = ${formula}) or (${table.voided} = true and ${table.netWeightGrams} = greatest(0, ${formula})))`,
      ),
    ];
  },
);

export type PalletSet = typeof palletSets.$inferSelect;
export type NewPalletSet = typeof palletSets.$inferInsert;
export type Pallet = typeof pallets.$inferSelect;
export type NewPallet = typeof pallets.$inferInsert;
