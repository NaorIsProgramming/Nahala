# 10 — Services, access checks, and tests

Status: not started. Pallet-intake task 3. Depends on 09. Do not start 11.

## Goal

Set and reference services enforce the plan, including audit writes, grower and kind limits, and the voided tare update. No new screens.

## Read first

- `docs/project/STATE.md`
- `docs/project/plans/pallet-intake.md` (Kinds, Weights, Tare edits, Services, Access hook, Test plan, Users-feature checklist, Risks)
- `docs/project/todo.md`
- `lib/access.ts`, `lib/services/reference-data.ts`, `db/schema/pallet-sets.ts`, `db/schema/audit.ts`, `db/index.ts`

## Acceptance

- The plan’s service tests pass against local Postgres, including concurrency and the grower and kind cases. List, detail, reference-number lookup, add, remove, and the grower dropdown all use `scopeForSets` in the same query. Rows are not loaded and then filtered in JavaScript.
- Create, header update, add, update, and remove are each one transaction. A thrown error after an insert leaves no partial pallet and no audit event. An empty create succeeds. A header update does not change the pallet count. Removing the last pallet leaves the set active and still holding its reference number.
- A voided tare edit runs one `UPDATE`. Active pallets keep their stored tare and net. A voided pallet whose formula stays non-negative stores that result. One whose formula goes negative stores net 0 and the new tare. One audit event is written on the type, not one event per pallet.
- `security-reviewer` has reviewed the services. `verifier` has run typecheck, lint, and tests. The report quotes that output.

## Scope

`lib/pallet-sets/kinds.ts` and `lib/pallet-sets/net-weight.ts` have no database import. `PACKAGE_FLOW` is the only map from kind to `in` or `none`.

`lib/services/pallet-sets.ts` implements the functions in the plan’s Services section: list, voided list, get, lookup by reference number, create, header update, the shared add/update/remove function, and void. Zod allowlists client fields. The server sets id, timestamps, actor, `voided`, both tares, net weight, the copied `grower_id`, and `revision`. The client cannot send net weight or tare.

Unique violation `23505` maps to the same conflict as the pre-check, using the constraint names from task 09. Codes: `REFERENCE_NUMBER_TAKEN`, `PALLET_NUMBER_TAKEN` (every colliding number), `SET_REVISION_CONFLICT`, `NET_WEIGHT_NEGATIVE`, `PALLET_NUMBER_DUPLICATE`, `SET_TOO_LARGE` (more than 500 pallets in one request), `SET_VOIDED`, `INACTIVE_REFERENCE`, `NOT_FOUND`, `READ_ONLY`. Hebrew message on the result. English code is stable. `NOT_FOUND` is the same for a missing id and a set the actor cannot see.

Extend the reference service so a tare change runs the voided-pallet update in the same transaction and writes one `tare_changed` audit event.

`scopeForSets` builds the predicate from the plan’s grant rules. Null grower or kind on a grant means all of that field. Several pallet-set grants are a union. Write wins over read. Changing grower or kind requires a write grant on the current pair and on the new pair. A move outside write scope returns a generic Hebrew denial and does not reveal whether the destination grower exists.

Tests construct actors and also map real `access_grants` rows through the same loader `getActor` uses. Clean up committed rows in `finally`. Refuse a non-local database host. The concurrency case uses two connections.

## Constraints

- Do not build un-void, package balances, seasons, API routes, or a user screen.
- Do not denormalize kind or date onto pallets.
- One audit event plus a bulk insert of subject rows per save. Subjects are the set and each pallet that was inserted, updated, or removed. The summary is a compact diff, not a copy of unchanged rows.
- Removing a pallet deletes the live row. Its id and last values stay in the audit subject and summary.

## Security and performance

- Default deny when there are no grants. A package-type grant cannot create a set or edit growers.
- Grant load stays once per request. The scope predicate is in the `WHERE`, so the partial indexes from task 09 can apply.
- The tare update is one statement. It does not load pallet rows into JavaScript.

## Do not touch

The launcher, reference screens except the tare-update path, auth tables, `/api/v1`.

## Report when done

Files changed, the real test, typecheck, and lint output, and what the security reviewer found. Do not start 11.
