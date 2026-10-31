import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  integer,
  pgTable,
  text,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

import { REFERENCE_NAME_MAX_LENGTH, TARE_MAX_GRAMS } from "@/lib/reference-limits";

import { timestampColumns } from "./timestamps";

function referenceNameCheck(constraintName: string, name: AnyPgColumn) {
  return check(
    constraintName,
    sql`char_length(${name}) between 1 and ${sql.raw(String(REFERENCE_NAME_MAX_LENGTH))} and ${name} = btrim(${name}) and ${name} !~ '[[:cntrl:]]'`,
  );
}

function tareGramsCheck(constraintName: string, tareGrams: AnyPgColumn) {
  return check(
    constraintName,
    sql`${tareGrams} >= 0 and ${tareGrams} <= ${sql.raw(String(TARE_MAX_GRAMS))}`,
  );
}

export const growers = pgTable(
  "growers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    ...timestampColumns(),
  },
  (table) => [
    // Inactive rows may share a name so a later active row can reuse it.
    uniqueIndex("growers_active_name_uidx")
      .on(table.name)
      .where(sql`${table.isActive} = true`),
    referenceNameCheck("growers_name_check", table.name),
  ],
);

export const yieldTypes = pgTable(
  "yield_types",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    ...timestampColumns(),
  },
  (table) => [
    uniqueIndex("yield_types_active_name_uidx")
      .on(table.name)
      .where(sql`${table.isActive} = true`),
    referenceNameCheck("yield_types_name_check", table.name),
  ],
);

export const packageTypes = pgTable(
  "package_types",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    tareGrams: integer("tare_grams").notNull(),
    countsInGrowerInventory: boolean("counts_in_grower_inventory")
      .default(true)
      .notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    ...timestampColumns(),
  },
  (table) => [
    uniqueIndex("package_types_active_name_uidx")
      .on(table.name)
      .where(sql`${table.isActive} = true`),
    referenceNameCheck("package_types_name_check", table.name),
    tareGramsCheck("package_types_tare_grams_check", table.tareGrams),
  ],
);

export const palletTypes = pgTable(
  "pallet_types",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    tareGrams: integer("tare_grams").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    ...timestampColumns(),
  },
  (table) => [
    uniqueIndex("pallet_types_active_name_uidx")
      .on(table.name)
      .where(sql`${table.isActive} = true`),
    referenceNameCheck("pallet_types_name_check", table.name),
    tareGramsCheck("pallet_types_tare_grams_check", table.tareGrams),
  ],
);
