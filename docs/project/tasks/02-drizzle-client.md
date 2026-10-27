# 02 — Drizzle client and migration workflow

Status: not started. Depends on task 01.

## Goal

One server-only Drizzle client using the app role, and a generate / migrate workflow using the migrator role. No tables yet.

## Read first

- `docs/project/STATE.md`
- `docs/project/plans/foundation.md` (Drizzle, Approved dependencies)
- `.cursor/rules/nextjs-react-tailwind-ts.mdc` (Database)
- `lib/env.ts`, `docker-compose.yml`, `package.json`, `tsconfig.json`

Look up the installed `drizzle-orm@0.45.4` and `drizzle-kit@0.31.11` docs before writing the client or `drizzle.config.ts` (postgres.js client, `max`, `drizzle()` call shape, `defineConfig`).

## Acceptance

- `npm run db:migrate` exits 0 against `MIGRATE_DATABASE_URL`.
- A one-off query through the app client returns `current_user` = `nahala_app`.
- `npm run typecheck`, `npm run lint`, and `npm run build` pass.
- There is no `db:push` script. No client component imports `db/index.ts`.

## Scope

Install the approved packages this task needs:

- `drizzle-orm@0.45.4`
- `postgres@3.4.9`
- `drizzle-kit@0.31.11` as a devDependency
- `server-only@0.0.1` if task 01 did not already need it
- `zod@4.6.7` if task 01 did not add it

Do not install Better Auth yet.

Create:

- `db/index.ts`, starting with `import "server-only"`
- `db/schema/index.ts` (re-export point; no domain tables)
- `drizzle.config.ts`
- Scripts `db:generate` (`drizzle-kit generate`) and `db:migrate` (`drizzle-kit migrate`)

## Constraints

- One postgres.js client, `max: 10`. Do not set `prepare: false`. Cache the client on `globalThis` in development so hot reload does not open a new pool.
- The app client uses `DATABASE_URL` from `lib/env.ts` (the `nahala_app` role). `drizzle.config.ts` uses `MIGRATE_DATABASE_URL` and must not import `db/index.ts`.
- Use the `drizzle()` form the installed `drizzle-orm/postgres-js` types accept that is not marked deprecated. Pass `schema` once tables exist; an empty schema module is fine here.
- Comment on `drizzle.config.ts`: `drizzle-kit push` is only for a throwaway local database. Do not add a script for it, and do not run it against `nahala`.
- `drizzle-kit migrate` opens its own connection. Do not add the programmatic `migrate()` helper (that one wants `max: 1`).
- If `db:generate` with an empty schema produces no SQL, that is fine. `db:migrate` must still exit 0.
- Do not hand-write a migration.

## Security and performance

- The Next.js process never uses the superuser or the migrator URL.
- Pool cap is 10, one client per process. Do not raise it.
- `db/index.ts` is server-only. Importing it from a client component must fail the build.

## Do not touch

Auth tables, pages, compose port, roles.

## Report when done

Files changed, packages added with versions, `db:migrate` result, `current_user` result, and the real typecheck, lint, and build output. Do not start task 03.
