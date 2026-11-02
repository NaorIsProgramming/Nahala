import { sql, type SQL } from "drizzle-orm";
import {
  check,
  index,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { user } from "./auth";
import { timestampColumns } from "./timestamps";

export const AUDIT_ACTIONS = ["created", "updated", "voided", "tare_changed"] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export const AUDIT_SUBJECT_TYPES = [
  "pallet_set",
  "pallet",
  "grower",
  "yield_type",
  "package_type",
  "pallet_type",
] as const;

export type AuditSubjectType = (typeof AUDIT_SUBJECT_TYPES)[number];

function sqlStringList(values: readonly string[]): SQL {
  return sql.raw(
    values
      .map((value) => {
        if (!/^[A-Za-z0-9_]+$/.test(value)) {
          throw new Error("Refusing to embed an unsafe audit literal");
        }
        return `'${value}'`;
      })
      .join(", "),
  );
}

export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    at: timestamp("at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
    actorUserId: text("actor_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    action: text("action").notNull(),
    summary: jsonb("summary").notNull(),
    ...timestampColumns(),
  },
  (table) => [
    index("audit_events_actor_user_id_idx").on(table.actorUserId),
    check(
      "audit_events_action_check",
      sql`${table.action} in (${sqlStringList(AUDIT_ACTIONS)})`,
    ),
  ],
);

export const auditSubjects = pgTable(
  "audit_subjects",
  {
    eventId: uuid("event_id")
      .notNull()
      .references(() => auditEvents.id, { onDelete: "restrict" }),
    subjectType: text("subject_type").notNull(),
    subjectId: uuid("subject_id").notNull(),
    ...timestampColumns(),
  },
  (table) => [
    primaryKey({
      name: "audit_subjects_pkey",
      columns: [table.eventId, table.subjectType, table.subjectId],
    }),
    index("audit_subjects_subject_idx").on(
      table.subjectType,
      table.subjectId,
      table.eventId,
    ),
    check(
      "audit_subjects_subject_type_check",
      sql`${table.subjectType} in (${sqlStringList(AUDIT_SUBJECT_TYPES)})`,
    ),
  ],
);

export type AuditEvent = typeof auditEvents.$inferSelect;
export type NewAuditEvent = typeof auditEvents.$inferInsert;
export type AuditSubject = typeof auditSubjects.$inferSelect;
export type NewAuditSubject = typeof auditSubjects.$inferInsert;
