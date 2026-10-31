# 13 — History screen

Status: not started. Pallet-intake task 6. Depends on 12. API routes stay blocked.

## Goal

A signed-in user can read the audit trail that task 10 already writes, from a set, a pallet, and a reference-data row.

## Read first

- `docs/project/STATE.md`
- `docs/project/plans/pallet-intake.md` (Audit trail, task 6)
- `docs/project/todo.md` item 1
- `db/schema/audit.ts`, `lib/services/pallet-sets.ts`, the set detail page, one reference admin page

## Acceptance

- Opening a set does not query the audit tables until the history panel is opened. That query uses the `(subject_type, subject_id, event_id)` index and is limited.
- Removing a pallet still shows that pallet’s UUID and its last number and weights on the set history.
- A tare change shows one event on the package type or pallet type, not one event per pallet.
- Browser, light and dark. `security-reviewer` has reviewed the read. `verifier` has run typecheck, lint, tests, and build. Quote the results.
- No new migration unless a missing index is found. If you add one, `migration-reviewer` reads it before migrate.

## Scope

A read function that looks up `audit_subjects` by id and joins the event. A Hebrew history panel on the set detail and on the reference admin screens. The panel is not on the list page.

Do not add a new write path. Task 10 already writes the events. If a mutation from tasks 10–12 does not write an event, fix that write in the service rather than inventing a second logger.

## Constraints

- Hebrew, RTL, tokens, both themes. UUIDs in the history panel are LTR inside `<bdi>`.
- Do not build un-void, package balances, or `/api/v1`.
- The list and the detail page’s first load still do not join `audit_events`.

## Security and performance

- The read checks the actor can see that subject. A set the actor cannot see returns `NOT_FOUND` and the same generic Hebrew text as a missing id. Do not return the event summary for an out-of-scope id.
- One indexed lookup, limited. Do not scan the jsonb summary.

## Do not touch

Grant rules, the net-weight check, the API-key plugin, auth tables.

## Report when done

Files changed, the history query, and the real browser, typecheck, lint, test, and build results. Stop. Do not add `/api/v1`. That waits on an explicit API-key approval, which this plan’s approval was not.
