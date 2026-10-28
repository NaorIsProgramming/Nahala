# Foundation

Status: approved 2026-10-27. Tasks 1–6 are done. Task 7 is not started.

The scaffold exists. `npm run build` passed on 2026-10-27 (Next.js 16.4.3, four static routes). No application code is part of this planning step.

## Goal

A local, self-hosted base the app can already sign in against:

- PostgreSQL 18 in Docker, not reachable from the network, with a least-privilege app role
- One server-only Drizzle client and a generate / review / migrate workflow
- Environment variables checked with Zod at server startup
- Better Auth (email and password only) on that database, with Hebrew sign-in and sign-out
- A session read once per request, and one protected placeholder page
- Security headers, auth rate limiting, and cookie settings
- A local bootstrap user, with public sign-up disabled in production

## Non-goals

- Pallets, sorting stages, reports, or any other domain table
- Roles and permissions. `STATE.md` still has the users-and-roles TODO. This plan does not design it.
- API keys and `/api/v1`
- The app Dockerfile, a VPS, backups, and deployment
- Email sending, email verification, password reset, OAuth, and passkeys
- A test runner. Acceptance here is commands and a browser check.
- `drizzle-zod`. Nothing in this scope validates a user-submitted table row.

## Docs used

The docs-researcher subagents could not call Context7 (they were blocked as non-read-only). The lookups below were done from this session. Versions are npm `latest` on 2026-10-27.

| Library | What was read | Version gap |
| --- | --- | --- |
| Drizzle ORM | Context7 `/drizzle-team/drizzle-orm/0.45.4` and the current Drizzle site (`defineConfig`, `dialect`, `dbCredentials.url`, `generate`, `migrate`, `push`) | Matches npm `drizzle-orm@0.45.4`. npm `drizzle-kit` is `0.31.11`. Context7's version list only went up to drizzle-kit `0.31.5`. |
| Better Auth | Context7 `/better-auth/better-auth/v1.6.23`, then the live docs because they disagree | npm latest is `1.7.14`. Context7's newest indexed tag was `v1.6.23`. The live adapter import is `@better-auth/drizzle-adapter`, not `better-auth/adapters/drizzle`. |
| Next.js headers and CSP | Context7 `/vercel/next.js/v16.2.9` | Installed Next.js is `16.4.3`. Context7's newest version tag was `v16.2.9`. |

PostgreSQL: the current stable major is **18** (latest minor **18.6**, released 2026-08-13). PostgreSQL 19 is RC 1 (2026-10-15), with general availability planned for 2026-11-19. Do not use 19.

## Approved dependencies

Approved with the plan. Install them during implementation, at these versions.

| Package | Version | Where | Why |
| --- | --- | --- | --- |
| `drizzle-orm` | 0.45.4 | dependency | The database client. |
| `postgres` | 3.4.9 | dependency | The postgres.js driver `drizzle-orm/postgres-js` expects. |
| `better-auth` | 1.7.14 | dependency | Self-hosted auth. Peers include Next 16, React 19, and `drizzle-orm` `^0.45.2`. |
| `@better-auth/drizzle-adapter` | 1.7.14 | dependency | Current docs say to install it and import `drizzleAdapter` from this package. |
| `zod` | 4.6.7 | dependency | Validates env at startup. Better Auth already depends on Zod 4; this makes `lib/env.ts` a direct dependency. |
| `server-only` | 0.0.1 | dependency | The `import "server-only"` guard. |
| `drizzle-kit` | 0.31.11 | devDependency | `generate` and `migrate`. |
| `auth` | 1.7.14 | devDependency | The Better Auth CLI (`auth generate`). This is the package the current docs mean by `npx auth@latest`. Do not add `@better-auth/cli` (it is still 1.4.21). Pin `auth` to 1.7.14 so a script cannot float ahead of `better-auth`. |

No other packages. Do not add `tsx`, `pg`, `drizzle-zod`, or the Better Auth admin plugin.

## Design

### Database

`docker-compose.yml` is the dev file. It runs the official image `postgres:18` (major 18, not `latest`, not 19). Named volume `nahala-pg-data`. Healthcheck uses `pg_isready`.

Mount that volume at `/var/lib/postgresql`. On the official `postgres:18` image, `PGDATA` is `/var/lib/postgresql/18/docker` and the image `VOLUME` is `/var/lib/postgresql` (Docker Hub image docs and the 18 Dockerfile). Do not mount `/var/lib/postgresql/data`. That path is for PostgreSQL 17 and older; on 18 a mount there does not hold the data directory.

Dev compose publishes `127.0.0.1:5432:5432` only. Do not publish `5432:5432`. This file is dev-only. The production compose file, written later, publishes no database port and pins an exact image version (the patch, not the floating `postgres:18` tag). Do not write the production file in this plan.

The official image makes `POSTGRES_USER` a superuser. Leave that as the default `postgres` user, used only to boot the data directory. An init script in `docker/postgres/`, mounted at `/docker-entrypoint-initdb.d`, creates:

- Database `nahala`
- `nahala_migrator`: `LOGIN`, `NOSUPERUSER`, owner of `nahala`, allowed to create objects in `public`
- `nahala_app`: `LOGIN`, `NOSUPERUSER`, `CONNECT` on `nahala`, `USAGE` on `public`, and `SELECT` / `INSERT` / `UPDATE` / `DELETE` on tables the migrator creates (`ALTER DEFAULT PRIVILEGES`). No `CREATE`, no `DROP`.

The init script reads passwords from the environment. It does not contain passwords. It runs only when the volume is empty. Pass them into `psql` as quoted variables (`:'name'`), not by string-concatenating SQL.

The Next.js process uses `DATABASE_URL` (the app role). Drizzle Kit uses `MIGRATE_DATABASE_URL` (the migrator). Application code never reads `POSTGRES_PASSWORD`.

### Drizzle

- `db/index.ts` starts with `import "server-only"`. One postgres.js client, `max: 10` (Postgres default `max_connections` is 100; one Node process). Do not set `prepare: false` (no pooler). Cache the client on `globalThis` in development.
- Pass the schema into `drizzle()`. The 0.45.4 changelog deprecates the positional `drizzle(client)` call for node-postgres until v1; the postgres.js readme still shows the positional form. Use whichever form the installed `drizzle-orm/postgres-js` types accept that is not marked deprecated.
- `db/schema/index.ts` re-exports the tables. `drizzle.config.ts` points `schema` at that file, `out` at `db/migrations`, `dialect: "postgresql"`, and `dbCredentials.url` at `MIGRATE_DATABASE_URL`. It must not import `db/index.ts`.
- Scripts: `db:generate` (`drizzle-kit generate`), `db:migrate` (`drizzle-kit migrate`). No `db:push` script. `drizzle-kit push` is for a throwaway local database only; say so in a comment on the config. The Drizzle site describes `push` as a prototyping shortcut that skips migration files.
- Migrations that apply schema changes use a separate mental model from the app pool. `drizzle-kit migrate` opens its own connection. The postgres.js readme says a programmatic migrator needs `max: 1`; we are not using that helper.

### Environment

`lib/env.ts` is server-only. Zod checks the shape of the variables the app needs: `DATABASE_URL`, `BETTER_AUTH_SECRET` (at least 32 characters), `BETTER_AUTH_URL`. It does not open a connection and does not parse `POSTGRES_PASSWORD`.

Validate when server code first loads those modules, not during module evaluation of the public pages. `npm run build` must not require a running database. It does need syntactically valid values once a route imports auth, because the build loads server modules. Missing or short secrets fail `next dev` with a server log, not a stack trace in the browser.

`.env.example` lists every variable with empty or obvious placeholders (`change-me` style), no real secrets. `.env*` stays gitignored except `.env.example`.

### Better Auth

`lib/auth.ts` is server-only. `betterAuth` with the Drizzle adapter, `provider: "pg"`, and the generated schema passed through.

Email and password only: `emailAndPassword.enabled: true`. No social providers. No email verification and no `sendResetPassword` (there is no mailer). Minimum password length 12.

Public sign-up: `emailAndPassword.disableSignUp`. The current email-and-password docs list this flag. Set it so sign-up is always off in production, and off in development except inside the bootstrap script (see below). `nextCookies()` from `better-auth/next-js` is the last plugin, so a later Server Action can set cookies.

Schema: do not hand-write auth tables. From `lib/auth.ts`:

```bash
npx auth generate --adapter drizzle --dialect postgresql --output db/schema/auth.ts --yes
```

The CLI looks for `auth.ts` under `lib/` (among other paths). Default Drizzle output would be a root `schema.ts`; `--output` keeps it in `db/schema/`. Then `db:generate`, review the SQL, then `db:migrate`. Do not run the CLI's `migrate` (that path is for the Kysely adapter) and do not run `auth create-admin` (it requires the admin plugin and a role).

The live adapter docs describe two relation styles. The default adapter is relations v1 (`relations()`). Relations v2 uses `@better-auth/drizzle-adapter/relations-v2` and `defineRelations`. Use the adapter that matches what this CLI emits. Do not convert the file by hand. If the generated file includes relations, set `advanced.database.joins: true` so `getSession` can join instead of round-tripping. Pass those relations through the adapter schema.

Keep the CLI's id and timestamp column types. Better Auth's default ids are strings. The project convention wants `timestamptz`; the adapter docs say the CLI emits Drizzle `timestamp()` and that `withTimezone: true` also works. Do not rewrite the generated columns in this plan. The task reports what SQL was produced.

Route handler: `app/api/auth/[...all]/route.ts` exports `GET`, `POST`, `PUT`, `PATCH`, and `DELETE` from `toNextJsHandler(auth)` in `better-auth/next-js`.

`lib/auth-client.ts` is the browser client (`createAuthClient`). It must not import `db`, `lib/auth.ts`, or `server-only`.

`lib/session.ts` is server-only. It wraps `auth.api.getSession({ headers: await headers() })` in React `cache()` so one request does the lookup once. Do not call it from the root layout. That would make every page dynamic, including the public home page.

Pages:

- `/sign-in` — Hebrew form (email, password, errors), RTL, brand tokens, both themes, the existing theme toggle. A small client leaf submits with `authClient.signIn.email`.
- Sign-out control calls `authClient.signOut`.
- `/app` — server page. No session redirects to `/sign-in`. With a session it shows a short Hebrew placeholder and the user's name inside `<bdi>`, plus sign-out.

`/` stays the public placeholder.

`BETTER_AUTH_SECRET` and `BETTER_AUTH_URL` come from the environment. The live installation docs require the secret to be at least 32 characters. `trustedOrigins` is only the origin of `BETTER_AUTH_URL` (local default `http://localhost:3000`). No wildcards.

Cookies, from the current security docs: `httpOnly` is on, `sameSite` defaults to `lax`, and `secure` is set when the base URL is `https`. Keep those. Do not force `secure` on local `http`, or sign-in breaks. The task checks the `Set-Cookie` header. Set the attributes explicitly only if the installed options expose a documented field; do not invent the field name.

Rate limiting: turn the built-in limiter on, storage `memory`. The current rate-limit docs already tighten `/sign-in/email` to 3 requests per 10 seconds. Keep that, and give `/sign-up/email` a limit at least that strict. Memory is enough for one Node process. A second instance needs a shared store; that waits for deployment, which is out of scope.

### Bootstrap user

There is no role. The script creates one ordinary user who can sign in.

`db/seed.ts` (script `db:seed`):

1. Exit with a non-zero status if `NODE_ENV` is `production`.
2. Exit if the `DATABASE_URL` host is not `localhost` or `127.0.0.1`.
3. Only then set a process-local flag the auth config treats as permission to call `auth.api.signUpEmail`. The Next.js server never sets that flag, and production ignores it even if it is set.
4. Read `SEED_USER_EMAIL` from the environment. No default. Exit if it is missing.
5. Read `SEED_USER_PASSWORD` from the environment. If it is unset, prompt on the terminal without echoing. No default. Refuse a short password. Never print the password, including in errors, logs, or the prompt.
6. Create the user by calling Better Auth's own server API (`auth.api.signUpEmail`). Do not hash the password yourself and do not insert into the auth tables. A second run is a success if that email already exists. Do not print the API body.

Node is v22.22.1. Run the script with type stripping and `--conditions=react-server` so it may import modules that use `server-only`. No extra runner. Do not add a prompt library.

`npx auth create-admin` stays out. It requires the admin plugin and a role. How the first user is created on the production server is an open question for the deployment plan. This seed does not answer it.

### Security headers

In `next.config.ts` `headers()`, for all routes:

- `Content-Security-Policy` — static, not a nonce. `'unsafe-inline'` is allowed only on `script-src` and `style-src`. Every other directive stays strict: `default-src 'self'`, `object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'none'`, `form-action 'self'`, plus `font-src 'self'`, `img-src 'self'`, and `connect-src 'self'`. Development adds `'unsafe-eval'` to `script-src` only.
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-Frame-Options: DENY` and CSP `frame-ancestors 'none'`
- `Strict-Transport-Security` only when `NODE_ENV` is `production`. Do not add `preload`.

The Next.js 16.2.9 CSP guide (closest Context7 tag; the app is 16.4.3) has two paths:

- A static policy in `headers()`. The documented non-nonce policy still includes `'unsafe-inline'` for scripts and styles. Development also adds `'unsafe-eval'` for the dev server.
- A nonce policy in `proxy.ts` (Next.js 16 renamed middleware to proxy). Nonces force dynamic rendering on every page and disable static optimization. The guide says to ask for that deliberately. This plan does not add `proxy.ts`.

`upgrade-insecure-requests` only in production. On local `http` it would upgrade the dev server to `https` and break it.

`next-themes` injects an inline script. The static policy above keeps the theme toggle working and keeps `/` static. Task 7 reconsiders a nonce-based CSP and does not implement one.

`import "server-only"` on `db/index.ts`, `lib/env.ts`, `lib/auth.ts`, and `lib/session.ts`.

## Risks

Security:

- The Docker superuser still exists. The app and Drizzle Kit must not use it. The acceptance check is `rolsuper` for both new roles.
- Init scripts do not re-run on an existing volume. A broken first boot needs `docker compose down -v` locally. Never do that against anything but this local volume.
- `BOOTSTRAP_SIGN_UP` (name flexible) must not be read as "turn on public sign-up" in production. Production forces `disableSignUp` regardless.
- No password reset. A lost bootstrap password means resetting the local volume or writing a later, reviewed recovery path. Do not add email reset in this work.
- Memory rate limits do not coordinate across processes. Fine for one server, insufficient once we run more than one.
- A static CSP with `'unsafe-inline'` is weaker than a nonce policy. It is the choice that does not force every page to be dynamic.
- `getSession` on `/app` and `/sign-in` makes those routes dynamic. Leaving it off the root layout keeps `/` static.
- Build logs and the seed must not print the secret, the database URL, or the seed password.

Performance:

- App pool `max: 10`, one shared client per process.
- Session lookup is one cached call per request, and joins are enabled only when the generated relations support them.
- Security headers from `headers()` do not disable static rendering. A nonce CSP would.
- Env parsing is a string check, once, cached. It does not hit the database.

## Tasks

Briefs are written. Execute in order, one chat each. Each one leaves `npm run build` passing. Before library code, the executor looks up that task's API for the installed version. After auth, query, header, or env changes, run the security reviewer. Before applying a migration, run the migration reviewer. Before calling a task done, run the verifier.

| Task | Brief | Status |
| --- | --- | --- |
| 1. Postgres and env validation | `docs/project/tasks/01-postgres-and-env.md` | done |
| 2. Drizzle client and migration workflow | `docs/project/tasks/02-drizzle-client.md` | done |
| 3. Better Auth schema, migration, and route | `docs/project/tasks/03-better-auth-schema.md` | done |
| 4. Hebrew sign-in, sign-out, and a protected page | `docs/project/tasks/04-sign-in.md` | done |
| 5. Security baseline | `docs/project/tasks/05-security-baseline.md` | done |
| 6. Bootstrap user | `docs/project/tasks/06-bootstrap-user.md` | done |
| 7. Security audit | `docs/project/tasks/07-security-audit.md` | not started |

### 1. Postgres and env validation

Goal: a local database with two non-superuser roles, and a Zod env module the app can load.

Files: `docker-compose.yml`, `docker/postgres/init-roles.sh`, `.env.example`, `lib/env.ts`.

Depends on: nothing.

Acceptance:

- `docker compose up -d` reaches healthy.
- `docker port` for `5432` is `127.0.0.1` only.
- The named volume is mounted at `/var/lib/postgresql`, and data is under `PGDATA` `/var/lib/postgresql/18/docker`.
- As `nahala_app`, `rolsuper` is false and `CREATE TABLE` fails.
- As `nahala_migrator`, `rolsuper` is false and `CREATE TABLE` succeeds. Drop that probe table.
- With a valid `.env`, `npm run typecheck` and `npm run build` pass.
- With `BETTER_AUTH_SECRET` removed, starting the server fails before it serves a page, and the response does not contain a stack trace.

### 2. Drizzle client and migration workflow

Goal: one server-only client and an empty, reviewed migration path. No tables yet.

Files: `db/index.ts`, `db/schema/index.ts`, `drizzle.config.ts`, `package.json` scripts.

Depends on: 1.

Acceptance:

- `npm run db:migrate` exits 0 against the local migrator URL.
- The app client connects as `nahala_app` (`SELECT current_user`).
- `npm run typecheck`, `npm run lint`, and `npm run build` pass.
- No `db:push` script. `db/index.ts` is not imported by any client component.

### 3. Better Auth schema, migration, and route

Goal: generated auth tables applied by Drizzle, and a live auth route. No pages yet.

Files: `lib/auth.ts`, `db/schema/auth.ts`, `db/schema/index.ts`, `db/migrations/**`, `app/api/auth/[...all]/route.ts`.

Depends on: 2.

Acceptance:

- The auth tables exist and were created by the committed migration, not by `push`.
- `nahala_app` can `SELECT` from them and still cannot `CREATE TABLE`.
- `POST /api/auth/sign-up/email` is rejected (sign-up disabled).
- `npm run typecheck`, `npm run lint`, and `npm run build` pass.
- The migration reviewer has looked at the SQL before `db:migrate`.

### 4. Hebrew sign-in, sign-out, and a protected page

Goal: prove the session helper. A successful sign-in waits for task 6; this task proves the closed door.

Files: `lib/auth-client.ts`, `lib/session.ts`, `app/sign-in/page.tsx`, a small sign-in form, `app/app/page.tsx`.

Depends on: 3.

Acceptance:

- `/sign-in` renders Hebrew labels, RTL, and the theme toggle works in light and dark (browser).
- `GET /app` while signed out redirects to `/sign-in`.
- A wrong password shows a Hebrew error and does not set a session cookie.
- `/` is still the public home page and still static in the build output.
- `npm run typecheck`, `npm run lint`, and `npm run build` pass.

### 5. Security baseline

Goal: headers, explicit auth limits, and a check of the cookie flags.

Files: `next.config.ts`, `lib/auth.ts`.

Depends on: 4.

Acceptance:

- `curl -sI` on `/` includes the CSP, `nosniff`, `Referrer-Policy`, and frame protection. Local responses do not include HSTS.
- The CSP is the approved static policy (no nonce, no `proxy.ts`). `'unsafe-inline'` appears only on `script-src` and `style-src`.
- In the browser, `/` and `/sign-in` still load, and the theme toggle still works in both themes.
- Repeated `POST /api/auth/sign-in/email` eventually returns 429.
- A sign-in attempt's `Set-Cookie` is `HttpOnly` and `SameSite=Lax`. On local `http` it is not `Secure`.
- `npm run typecheck`, `npm run lint`, and `npm run build` pass. `/` is still static.

### 6. Bootstrap user

Goal: one local user, created only by the seed, with sign-up still disabled for the app.

Files: `db/seed.ts`, `package.json` script, `.env.example`, and the `disableSignUp` branch in `lib/auth.ts`.

Depends on: 5.

Acceptance:

- `npm run db:seed` creates the user through Better Auth's API. A second run exits 0 and does not create a duplicate.
- The password is never printed. There is no default password. A silent prompt works when `SEED_USER_PASSWORD` is unset.
- `NODE_ENV=production npm run db:seed` exits non-zero and creates nothing.
- A `DATABASE_URL` whose host is not `localhost` or `127.0.0.1` exits non-zero.
- In the browser, that user can sign in, see `/app`, and sign out. After sign-out, `/app` redirects to `/sign-in`.
- `POST /api/auth/sign-up/email` against the running app is still rejected.
- `npm run typecheck`, `npm run lint`, and `npm run build` pass.

### 7. Security audit

Goal: a read-only findings report, using `.cursor/rules/security-audit.mdc`. No fixes in the same step.

Files: none, unless a later approval says so.

Depends on: 6.

Acceptance:

- Findings grouped by severity, each with file, line, impact, and a proposed fix. "None" is a valid result only with a coverage note.
- `npm audit`, `npm run typecheck`, and `npm run lint` were run, and the real output is in the report.
- The report says what was not reviewed (production host, firewall, backups).
- The report reconsiders a nonce-based CSP (the `next-themes` inline script, and the cost of forcing every page dynamic) and does not implement one.

## Decided

- Dev image `postgres:18`. Volume at `/var/lib/postgresql`. Dev port `127.0.0.1:5432:5432`. Production compose, later, publishes no database port and pins an exact version.
- Static CSP. `'unsafe-inline'` only on `script-src` and `style-src`. Other directives stay strict. Nonce CSP is reconsidered in task 7, not implemented here.
- Local bootstrap user only, via Better Auth's API. Password from the environment or a silent prompt. No default, never printed. Sign-up stays off in the running app, including in development.

## Open questions

1. **Production first user.** This seed refuses to run in production. How the first user is created on the production server is not decided. Solve it in the deployment plan.
2. **Roles.** Still unknown: who uses Nahala and what each may do. Not part of this plan. The bootstrap user is not an admin.

## Assumptions unless you change them

- Sign-in URL is `/sign-in`. The protected placeholder is `/app`. `/` stays public.
- Password minimum is 12. Better Auth's default is 8.
- `SameSite=Lax`. HSTS in production has no `preload`.
- Rate limiting stays on in development so task 5 can observe a 429.
- Auth ids and timestamp types stay as the CLI generates them.
- The scaffold stays uncommitted. Committing it is not part of these tasks.
