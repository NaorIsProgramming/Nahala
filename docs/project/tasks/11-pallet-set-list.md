# 11 — List, detail, void, and the voided view

Status: not started. Pallet-intake task 4. Depends on 10. Do not start 12.

## Goal

A signed-in user opens מיון ראשוני, finds an active set (including one with no pallets), adds or removes one pallet, voids the set, and finds it afterward only on the voided list.

## Read first

- `docs/project/STATE.md`
- `docs/project/plans/pallet-intake.md` (Services, Screens, Access hook)
- `docs/project/todo.md` item 1
- `lib/services/pallet-sets.ts`, `lib/access.ts`, `components/ui/launcher-tile.tsx`, `app/app/page.tsx`
- `.cursor/rules/brand-design.mdc`

Look up Next.js 16 Server Actions before writing the forms. `useActionState` comes from `react`. Expected errors are return values. Installed Next.js is 16.4.3; Context7’s closest tag is v16.2.9.

## Acceptance

- The home launcher shows מיון ראשוני (`Boxes`) beside טבלאות. The list title is מיון ראשוני. Kinds B and C stay on that list, behind the kind filter. The route stays `/app/pallet-sets`.
- Filters and page live in the query string: kind, grower, date from, date to, exact reference number, page. Default page size 50, maximum 100. Order is `received_on DESC, reference_number DESC, id DESC`. The active list never shows a voided set. An empty active set does. The date column shows day and month. The year is in the filter and on the detail page.
- Detail loads in at most two queries and does not query the audit tables. From the detail page, add one pallet and remove it. The set stays on the active list with its reference number. The voided detail has no add or remove control.
- Void asks for confirmation. The set then disappears from the active list and appears on the voided list, which is a link from the active list, not a home tile.
- Browser, light and dark. Numbers and ids that are shown are LTR inside `<bdi>`. `security-reviewer` has reviewed the actions. `verifier` has run typecheck, lint, tests, and build. Quote the results.

## Scope

Thin pages under `app/app/pallet-sets/` and feature components under `features/pallet-sets/`. Static segments `new` and `voided` must stay ahead of `[id]`. A minimal new-set header can exist so void-and-reuse is visible, but the multi-row keyboard grid is task 12. This task’s add control is one pallet at a time and calls `addPallets` and `removePallets`.

Server Actions authenticate, parse with the shared Zod schemas, and call the services. They do not contain business logic. They send the revision the page loaded.

Omit the מיון ראשוני tile when the actor cannot read sets. The seed user is a global writer, so the browser session shows it.

## Constraints

- Hebrew, RTL, logical utilities, brand tokens, both themes. No new color tokens. A voided state uses a word plus an icon, not color alone.
- Do not show UUIDs in the list or accept them in search. Links use the set UUID.
- Do not build un-void, the history panel, or `/api/v1`.
- Empty set is valid. Do not require a pallet before save of the header, if this task includes that header form.

## Security and performance

- The list and detail call the services, which already apply `scopeForSets`. Do not add a second filter in the page.
- Detail is at most two queries. No audit join.

## Do not touch

The net-weight formula, the schema, grant rules, reference-data tables except to read active rows for the single-pallet form.

## Report when done

Files changed, the queries used on detail, and the real browser, typecheck, lint, test, and build results. Do not start 12.
