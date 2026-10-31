# 09 — Pallet-set schema and migration

Status: not started. Pallet-intake task 2. Depends on 08. Do not start 10.

## Goal

`pallet_sets`, `pallets`, and the audit tables exist with the constraints and indexes in the plan. No set UI and no set services yet.

## Read first

- `docs/project/STATE.md`
- `docs/project/plans/pallet-intake.md` (Pallet sets and pallets, Indexes, Audit trail, Weights, Tare edits, Risks)
- `docs/project/todo.md` item 1 (do not build un-void)
- `db/schema/reference-data.ts`, `db/schema/access-grants.ts`, `db/schema/auth.ts`, `db/schema/index.ts`, `drizzle.config.ts`

Look up the installed Drizzle 0.45.4 types for `uniqueIndex().where()`, composite `foreignKey()` with `onUpdate` and `onDelete`, and `check()`. Context7 `/drizzle-team/drizzle-orm/0.45.4` shows `index().where(sql)` and `foreignKey()`. Match the installed call shape. Do not guess.

## Acceptance

- `migration-reviewer` has read the SQL before `npm run db:migrate`. The SQL shows both partial unique indexes (`WHERE voided = false` on reference number, and on grower plus pallet number), the composite foreign key `ON UPDATE CASCADE` `ON DELETE RESTRICT`, the named unique `(id, grower_id, voided)`, the net-weight check (stored net `>= 0`; active net equals the formula; voided net equals `GREATEST(0, formula)`), and the list and tare indexes from the plan.
- Nothing destructive. `0000_auth.sql` untouched. No hard delete.
- Sign-in and the reference screens still work. `npm run typecheck`, `npm run lint`, and `npm run build` pass.
- If `generate` drops a `WHERE` or the cascade, fix the schema and generate again. Do not hand-edit an applied migration. Do not migrate until the SQL is right.

## Scope

`db/schema/pallet-sets.ts` and `db/schema/audit.ts`, re-exported from `db/schema/index.ts`. Columns, checks, and indexes are the plan sections named above. Domain ids are UUIDs. New timestamps are `timestamptz`. `received_on` is a Postgres `date`. User foreign keys use `user.id` (`text`) with `ON DELETE RESTRICT`.

`revision` is an integer, default 1. The service will increment it later. This task does not write rows except a throwaway probe you delete.

Audit tables are created now so task 10 can write them in the same transaction as a save. Do not add a history screen.

Constraint names to emit: `pallet_sets_active_reference_number_uidx`, `pallets_active_grower_pallet_number_uidx`.

## Constraints

- A set’s `grower_id` and `kind` are `NOT NULL`. A null grower on a grant is not a null grower on a set.
- Integer bounds from the plan: reference and pallet numbers `>= 1`, package amount `>= 1`, gross and both tares `>= 0`, and the practical caps that keep tare times amount inside a 32-bit integer.
- Local database only. `nahala_app` must be able to insert into the new tables and still cannot `CREATE`.

## Security and performance

- No service and no screen in this task, so there is nothing new to authorize. Do not leave a query helper that selects every column of these tables for later copy-paste.
- The partial indexes are the performance control for list, uniqueness, and the later tare update. Do not add a second copy of kind or date onto `pallets`.

## Do not touch

Reference-data behavior, the launcher, `lib/auth.ts`, the auth migration, `/api/v1`.

## Report when done

Files changed, the migration filename, and the exact SQL clauses for the two partial unique indexes, the composite foreign key, and the net-weight check. Quote the reviewer outcome and the typecheck, lint, and build results. Do not start 10.
