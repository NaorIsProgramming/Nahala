import { relations, sql, type SQL } from "drizzle-orm";
import { check, index, pgTable, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import {
  GRANT_ACCESS_LEVELS,
  GRANT_SCOPES,
  PALLET_KINDS,
  REFERENCE_TABLES,
} from "@/lib/access-types";

import { user } from "./auth";
import { growers } from "./reference-data";
import { timestampColumns } from "./timestamps";

function sqlStringList(values: readonly string[]): SQL {
  return sql.raw(
    values
      .map((value) => {
        if (!/^[A-Za-z0-9_]+$/.test(value)) {
          throw new Error("Refusing to embed an unsafe grant literal");
        }
        return `'${value}'`;
      })
      .join(", "),
  );
}

export const accessGrants = pgTable(
  "access_grants",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    scope: text("scope").notNull(),
    access: text("access").notNull(),
    growerId: uuid("grower_id").references(() => growers.id, { onDelete: "restrict" }),
    kind: text("kind"),
    referenceTable: text("reference_table"),
    ...timestampColumns(),
  },
  (table) => [
    index("access_grants_user_id_idx").on(table.userId),
    index("access_grants_grower_id_idx").on(table.growerId),
    uniqueIndex("access_grants_one_global_write_uidx")
      .on(table.userId)
      .where(sql`${table.scope} = 'global' and ${table.access} = 'write'`),
    uniqueIndex("access_grants_one_global_read_uidx")
      .on(table.userId)
      .where(sql`${table.scope} = 'global' and ${table.access} = 'read'`),
    uniqueIndex("access_grants_one_reference_uidx")
      .on(table.userId, table.referenceTable)
      .where(sql`${table.scope} = 'reference'`),
    check(
      "access_grants_scope_check",
      sql`${table.scope} in (${sqlStringList(GRANT_SCOPES)})`,
    ),
    check(
      "access_grants_access_check",
      sql`${table.access} in (${sqlStringList(GRANT_ACCESS_LEVELS)})`,
    ),
    check(
      "access_grants_kind_check",
      sql`${table.kind} is null or ${table.kind} in (${sqlStringList(PALLET_KINDS)})`,
    ),
    check(
      "access_grants_reference_table_check",
      sql`${table.referenceTable} is null or ${table.referenceTable} in (${sqlStringList(REFERENCE_TABLES)})`,
    ),
    check(
      "access_grants_shape_check",
      sql`(
        (${table.scope} = 'global' and ${table.growerId} is null and ${table.kind} is null and ${table.referenceTable} is null)
        or (${table.scope} = 'reference' and ${table.access} = 'write' and ${table.referenceTable} is not null and ${table.growerId} is null and ${table.kind} is null)
        or (${table.scope} = 'palletSets' and ${table.referenceTable} is null)
      )`,
    ),
  ],
);

export const accessGrantsRelations = relations(accessGrants, ({ one }) => ({
  user: one(user, {
    fields: [accessGrants.userId],
    references: [user.id],
  }),
  grower: one(growers, {
    fields: [accessGrants.growerId],
    references: [growers.id],
  }),
}));
