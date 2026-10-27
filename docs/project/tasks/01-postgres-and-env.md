# 01 — Postgres and env validation

Status: done.

## Goal

A local PostgreSQL 18 database with a superuser used only for boot, plus two non-superuser roles, and a Zod env module the Next.js server loads at startup.

## Read first

- `docs/project/STATE.md`
- `docs/project/plans/foundation.md` (Database, Environment, Risks, task 1)
- `.cursor/rules/nextjs-react-tailwind-ts.mdc` (Database, Security, env)
- `.env.example`, `.gitignore`, `package.json`, `next.config.ts`

## Acceptance

- `docker compose up -d` reaches healthy.
- `docker compose port postgres 5432` shows `127.0.0.1` only. Nothing listens on `0.0.0.0:5432`.
- The named volume is mounted at `/var/lib/postgresql`. Inside the container, `PGDATA` is `/var/lib/postgresql/18/docker` and that directory contains the cluster (not an empty mount at `/var/lib/postgresql/data`).
- As `nahala_app`, `SELECT rolsuper` is false and `CREATE TABLE` fails.
- As `nahala_migrator`, `SELECT rolsuper` is false and `CREATE TABLE` succeeds. Drop that probe table before finishing.
- With a syntactically valid `.env`, `npm run typecheck` and `npm run build` pass. The build does not need a running database.
- With `BETTER_AUTH_SECRET` removed, `npm run dev` fails before it serves a page. The browser does not receive a stack trace or the secret's value.

## Scope

Create:

- `docker-compose.yml` (dev only)
- `docker/postgres/init-roles.sh` mounted at `/docker-entrypoint-initdb.d`
- `lib/env.ts` with `import "server-only"`
- Startup wiring so the server actually calls the validator (Next.js `instrumentation.ts` `register()`, after you confirm that hook against the Next.js 16.4.3 docs)
- `.env.example` placeholders only

Install nothing in this task. Zod arrives with the Drizzle task's approved dependency list if it is not already present. If Zod is not installed yet, add only `zod@4.6.7` so this task can validate env. Do not add the other approved packages early.

## Constraints

- Image: `postgres:18`. Not `latest`, not 19, not a patch pin. Production, later, pins an exact version and publishes no database port. Do not write a production compose file.
- Dev port is exactly `127.0.0.1:5432:5432`.
- Volume: `nahala-pg-data:/var/lib/postgresql`. Official `postgres:18` sets `PGDATA=/var/lib/postgresql/18/docker` and `VOLUME /var/lib/postgresql` (Docker Hub PGDATA note and the 18 Dockerfile). A mount at `/var/lib/postgresql/data` does not persist this image's data.
- Leave `POSTGRES_USER` as the default `postgres` superuser. The app and Drizzle never use it.
- Init script creates database `nahala`, role `nahala_migrator` (`LOGIN`, `NOSUPERUSER`, owner of `nahala`, can create objects in `public`), and role `nahala_app` (`LOGIN`, `NOSUPERUSER`, `CONNECT`, `USAGE` on `public`, `SELECT`/`INSERT`/`UPDATE`/`DELETE` via `ALTER DEFAULT PRIVILEGES` for objects the migrator creates). The app role cannot `CREATE` or `DROP`.
- Passwords come from the environment. The script file in git has no passwords. Pass them into `psql` as quoted variables (`:'name'`). Do not concatenate them into SQL text.
- Init scripts run only on an empty volume. Say that in a comment. Do not run `docker compose down -v` except on this local volume, and do not do it if a volume from a previous attempt holds something you were not told to delete. Ask first.
- `lib/env.ts` checks shape only: `DATABASE_URL` (app role), `BETTER_AUTH_SECRET` (at least 32 characters), `BETTER_AUTH_URL`. It does not connect, and it does not read `POSTGRES_PASSWORD`. Look up the Zod 4.6 API before writing the schema. Do not guess `z.string().url()`.
- `.env.example` lists every variable this task introduces, empty or obvious placeholders, no real secrets. `.env*` stays gitignored except `.env.example`.
- Do not print env values. A startup error may name the invalid variable. It must not include the value.
- App code must not read the superuser password. Compose may, from `.env`.

Suggested app URL (not a secret): `postgresql://nahala_app:<password>@127.0.0.1:5432/nahala`. Migrator URL is for the next task: `MIGRATE_DATABASE_URL`. You may add both to `.env.example` now. Passwords in URLs must be URL-encoded, or generated without characters that break a URL. Say which you did.

## Security and performance

- Loopback publish is still a local port. It is not reachable from other machines. Do not bind `0.0.0.0`.
- Validation is a cached string parse. It must not open Postgres during `next build` or on each request.
- One healthcheck, `pg_isready`, is enough. Do not add a second database or a published admin port.

## Do not touch

Auth, Drizzle client, app pages, domain tables, roles.

## Report when done

Files changed, the `docker compose port` line, `rolsuper` and `CREATE TABLE` results for both roles, the volume destination and `PGDATA`, and the real typecheck and build results. Note anything left unresolved. Do not start task 02.
