# 08 — Reference data and admin

Status: finished. Pallet-intake task 1. Do not start 09 from this brief.

## Goal

A signed-in user can maintain growers, yield types, package types, and pallet types in Hebrew. The launcher and the access hook exist. Pallet sets do not.

## Read first

- `docs/project/STATE.md`
- `docs/project/plans/pallet-intake.md` (Decisions, Reference data, Access hook, Screens through the tables tiles, task 1, Risks)
- `docs/project/todo.md`
- `.cursor/rules/nextjs-react-tailwind-ts.mdc` and `.cursor/rules/brand-design.mdc`
- `db/schema/auth.ts`, `db/schema/index.ts`, `db/index.ts`, `db/seed.ts`, `lib/session.ts`, `app/app/page.tsx`, `app/brand.css`

Look up Drizzle 0.45.4 `check`, `unique`, and `timestamptz` before writing the schema. Look up Next.js 16 Server Actions (`useActionState` from `react`) before the forms. Context7 has no Next.js 16.4.3 tag; the closest is v16.2.9, and the installed app is 16.4.3.

## Acceptance

- `migration-reviewer` has read the generated SQL before `npm run db:migrate`. New tables only. `nahala_app` can insert and still cannot `CREATE`. Auth migration `0000_auth.sql` is untouched.
- Screens create, rename, change a tare, toggle the inventory flag, and deactivate. Inactive rows disappear from the active list and remain on the admin list. Names are unique among active rows.
- `npm test` passes twice. `npm run typecheck`, `npm run lint`, and `npm run build` pass.
- Browser, light and dark: sign-in lands on `/app`, whose only tile is טבלאות. `/app/tables` shows מגדלים, סוגי יבול, סוגי אריזה, and סוגי משטח. A long Hebrew name. Tare is entered as kilograms and stored as grams. Keyboard reaches each tile. `security-reviewer` has reviewed the actions and queries. `verifier` has run, and the report quotes its output.

## Scope

Create `db/schema/reference-data.ts`, `db/schema/access-grants.ts`, re-export both from `db/schema/index.ts`, and generate the next migration. Tables and columns are the plan’s Reference data and Access hook sections. Domain ids are UUIDs. New timestamps are `timestamptz`. Do not copy the auth tables’ `timestamp` without time zone.

`lib/access.ts` is server-only. `getActor()` uses the cached session, then loads that user’s grants once per request. Grant shape includes `global`, `palletSets` (grower and kind, each nullable), and `reference`, even though no set table exists yet. An empty grant list denies every read and write. There is no user screen and no grant screen.

`lib/services/reference-data.ts` is the only place that writes these tables. Zod allowlists client fields. The server sets id, timestamps, and active defaults. No hard delete.

The seed inserts one global write grant for the existing local user and does nothing if that grant is already there. It still refuses production and a non-local database. Do not print the password or the database URL.

Install the current Vitest and pin the resolved version. Add an `npm test` script. Tests cover empty grants, a reference grant that cannot edit a different table, the global write grant, and the seed grant. They refuse a non-local database host. No Playwright, React Testing Library, or `drizzle-zod`.

`components/ui/launcher-tile.tsx` is the shared tile from the plan’s Screens section. Icons: `Table2`, `Users`, `Leaf`, `Package`, `SquareStack`. Do not add the מיון ראשוני tile. Omit a tile the actor cannot open.

Kilograms on screen, grams in the database, converted with integer arithmetic. Put that formatter in a module with no `server-only` import so the later pallet grid can use it. The client never sends grams that it computed with a binary float.

## Constraints

- Hebrew UI, RTL, logical Tailwind utilities, brand tokens, both themes. No new color tokens.
- A tare change in this task only updates the type row. The voided-pallet recalculation waits for task 10, when pallets exist.
- Package inventory defaults on. Deactivate instead of delete. Foreign keys from later pallets will be `ON DELETE RESTRICT`.
- Do not install the Better Auth admin plugin or the API-key plugin. Do not add `/api/v1`.
- Local database only.

## Security and performance

- Every service call takes an `Actor` and checks it in `lib/access.ts`. A reference grant for one table cannot update another.
- `getActor()` is one grant query per request, not one per row.
- Lists of these four tables are small. Still select only the columns the screen needs.

## Do not touch

Pallet sets, pallets, audit tables, the public home page, auth tables, `lib/auth.ts`.

## Report when done

Files changed, the migration name, confirmation the reviewer ran before migrate, and the real test, typecheck, lint, and build results. Note anything left unresolved. Do not start 09.
