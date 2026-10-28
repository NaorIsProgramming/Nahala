# Foundation security audit

Date: 2026-10-28. Scope: foundation tasks 1–6. Read-only. No application code was changed.

This report does not say the project is secure. It says what was reviewed, what was found, and what was not reviewed.

## Method

- Read the foundation code, `docs/project/STATE.md`, `docs/project/plans/foundation.md`, and `.cursor/rules/security-audit.mdc`.
- [Security review](7a5b19cd-bbf7-41f5-ad99-645757a931a8) reviewed the auth, seed, headers, and compose code. [Migration review](fcb1360f-c6b0-4cb4-9dc6-8bee05086238) reviewed `db/schema/auth.ts` and `db/migrations/0000_auth.sql`. Their claims were checked against the files and the installed libraries before they were included.
- Context7 docs were read by this session (see Documentation). Installed Better Auth is 1.7.14 and installed Next.js is 16.4.3. The newest Context7 tags are older. Where they disagree, the installed source and the live responses are what this report uses.
- Live checks used the already running `next dev` on port 3000 and read-only queries against the local Postgres container. No seed, no migration, no `drizzle-kit push`, no production server, and no new published port.

One session row is still in the local database. A sign-in used to read cookie flags inserted it. The first sign-out probe omitted `Content-Type` and got 415, so that row was not cleared. A later sign-in with `Content-Type: application/json` signed out cleanly. The token from the first sign-in was not printed and was not stored. This pass did not delete the row.

## Critical

None.

## High

None.

## Medium

### Auth rate limit trusts a single client-supplied `X-Forwarded-For`

- **File and line:** `lib/auth.ts` lines 47–60. Behavior is in `@better-auth/core` 1.7.14 `dist/utils/ip.mjs` `getIP` (lines 203–218) and `better-auth` `dist/api/rate-limiter/index.mjs` lines 242–248.
- **Problem:** Rate limiting is on, in memory, at 3 requests per 10 seconds for `/sign-in/email` and `/sign-up/email`. `advanced.ipAddress.trustedProxies` is unset. With no trusted proxy, Better Auth treats one valid `X-Forwarded-For` value as the client address and does not use the TCP peer address. Each distinct value is its own bucket. A missing header in development falls back to `127.0.0.1`. In production a missing or unusable header falls back to one shared `no-trusted-ip` bucket.
- **How it could be exploited:** On the running dev server, four sign-in posts with the same `X-Forwarded-For` returned 401, 401, 401, then 429. Four posts with a different `X-Forwarded-For` each time all returned 401. A client can rotate that header and skip the throttle. Requests that omit the header share one bucket, so one client can also lock sign-in for everyone else for the window. There is no account lockout. Online guessing is then limited by scrypt and the 12-character minimum.
- **Proposed fix:** Until a reverse proxy exists, set `advanced.ipAddress.ipAddressHeaders` to `[]` so the header is ignored and every client shares one bucket. When the proxy exists, set `trustedProxies` to that proxy only and have the proxy overwrite `X-Forwarded-For`. Do not turn the limiter off.
- **Performance:** An in-memory map on auth requests. No extra database query and no change to static rendering. The shared bucket can lock sign-in for every client at 3 attempts per 10 seconds. That is the tradeoff until the proxy is named.

This is already listed in `docs/project/STATE.md`. The live check shows it works as that note describes.

## Low

### Production may serve the session cookie without `Secure`

- **File and line:** `lib/env.ts` line 8. `lib/auth.ts` line 31. Cookie decision in `better-auth` `dist/cookies/index.mjs` line 23.
- **Problem:** `useSecureCookies` is unset. Installed Better Auth 1.7.14 sets `Secure` when `BETTER_AUTH_URL` starts with `https://`. `getEnv` accepts an `http` URL in any `NODE_ENV`. `HttpOnly` and `SameSite=Lax` are the library defaults.
- **How it could be exploited:** A production process left on `http://` sends the session cookie without `Secure`. Anything that can read that HTTP traffic can replay the session. HSTS does not protect a first request that never used HTTPS.
- **Proposed fix:** When `NODE_ENV` is `production`, reject a `BETTER_AUTH_URL` that is not `https`. Keep `Secure` off for local `http`.
- **Performance:** A string check at startup. No query and no effect on static pages.

The running app's `BETTER_AUTH_URL` is `http`, which is the local setup. A successful sign-in `Set-Cookie` was `better-auth.session_token`, `HttpOnly`, `SameSite=Lax`, and not `Secure`. Sign-out with a JSON body returned 200 and cleared that cookie with `Max-Age=0`.

Context7's Better Auth v1.6.23 cookie doc says cookies are secure in production mode. The installed 1.7.14 source keys `Secure` off the base URL scheme, and uses production mode only when the base URL is unset. This report follows the installed source.

### `BETTER_AUTH_SECRETS` would bypass the Zod check

- **File and line:** `lib/auth.ts` line 30. Override in `better-auth` `dist/context/create-context.mjs` lines 70–80.
- **Problem:** The app passes the Zod-checked `BETTER_AUTH_SECRET` (minimum 32 characters). Better Auth 1.7.14 prefers `BETTER_AUTH_SECRETS` when that variable is set, and only warns if a secret is short or low-entropy. It refuses the known default secret in production. Our schema does not know `BETTER_AUTH_SECRETS`.
- **How it could be exploited:** Not active now. `.env` does not define `BETTER_AUTH_SECRETS`, `AUTH_SECRET`, or `BETTER_AUTH_TRUSTED_ORIGINS` (names only; values were not printed). If an operator set a short `BETTER_AUTH_SECRETS` later, it would sign sessions instead of the validated secret.
- **Proposed fix:** Keep passing `secret`. If `BETTER_AUTH_SECRETS` is ever used, add it to the Zod schema with the same rules.
- **Performance:** None.

The configured `BETTER_AUTH_SECRET` is 64 characters and is above the library's entropy warning. The value is not recorded here.

### `next dev` listens on all interfaces

- **File and line:** `package.json` line 6 (`next dev`). No hostname is set.
- **Problem:** The dev server is bound to `*:3000`. Postgres is bound to `127.0.0.1:5432` only.
- **How it could be exploited:** Another machine on this network can reach the sign-in endpoint. Together with the rate-limit finding, it can rotate `X-Forwarded-For` from off this host. The database port is not part of that path.
- **Proposed fix:** Run the dev server on `127.0.0.1`. Decide the production bind address in the deployment plan.
- **Performance:** None.

### `drizzle-kit` pulls a vulnerable esbuild

- **File and line:** `package.json` line 37 (`drizzle-kit` 0.31.11, devDependency). Locked copy: `node_modules/@esbuild-kit/core-utils/node_modules/esbuild` 0.18.20.
- **Problem:** `npm audit` reports 4 moderate issues, all the same chain: `drizzle-kit` → `@esbuild-kit/esm-loader` → `@esbuild-kit/core-utils` → `esbuild` `<=0.24.2`. Advisory [GHSA-67mh-4wv8-2f99](https://github.com/advisories/GHSA-67mh-4wv8-2f99): esbuild's development server lets a malicious page send requests to that server and read the response. The top-level `esbuild` in the lockfile is 0.25.12, which is outside that range. The vulnerable copy is the nested one.
- **How it could be exploited:** A person running a tool that leaves that old esbuild dev server listening, and then opening a malicious site, could have that site call the dev server. `drizzle-kit` is not in the production bundle. `next dev` is Next's server, not this esbuild server.
- **Proposed fix:** Upgrade `drizzle-kit` when a release depends on esbuild above 0.24.2. Do not run `npm audit fix` blindly.
- **Performance:** None for the running app. A kit upgrade is a dev-tooling change.

### Node version is not recorded

- **File and line:** `package.json` has no `engines` field. There is no `.nvmrc` or `.node-version`.
- **Problem:** This machine is Node v22.22.1. Nothing in the repo requires that version. The seed loader exists because this binary reports `process.features.typescript` false.
- **How it could be exploited:** A different Node on a future host can change URL parsing, fetch, or the cookie stack the auth code relies on.
- **Proposed fix:** Add `engines` and `.nvmrc` for the version you intend to run.
- **Performance:** None.

### Dev Postgres image tag is not pinned

- **File and line:** `docker-compose.yml` line 10 (`image: postgres:18`).
- **Problem:** The tag floats to the current 18.x image. The running container is healthy, the volume destination is `/var/lib/postgresql`, the healthcheck is `pg_isready`, and the published port is `127.0.0.1:5432` only. There is no production compose file.
- **How it could be exploited:** A later `docker compose pull` can change the server without a commit. A production file that copied `5432:5432` would publish the database on every interface. This dev file does not do that.
- **Proposed fix:** The production compose file, when it is written, should pin the patch or a digest and publish no database port.
- **Performance:** None.

### Static CSP allows `'unsafe-inline'` scripts

- **File and line:** `next.config.ts` lines 10–11 and 22–34.
- **Problem:** The policy matches the approved static CSP. `'unsafe-inline'` is on `script-src` and `style-src`. Development also adds `'unsafe-eval'` to `script-src`. Other directives are strict. `nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and `X-Frame-Options: DENY` are set. HSTS and `upgrade-insecure-requests` are production-only. There is no nonce and no `proxy.ts`.
- **How it could be exploited:** Application code has no `dangerouslySetInnerHTML`, `eval`, or `new Function`. `next-themes` injects one fixed inline script (it also accepts a `nonce` prop; `app/layout.tsx` does not pass one). A successful sign-in JSON body includes a `token` field (confirmed live; the value was not recorded). The cookie is `HttpOnly`, so script cannot read the cookie, but it can read that JSON. `'unsafe-inline'` would not stop an injected inline script from doing so. There is no such sink in the app today.
- **Proposed fix:** Keep the static policy. See the nonce recommendation below. Do not adopt a nonce in this pass.
- **Performance:** The static header does not force dynamic rendering. A nonce policy would. `npm run build` still marks `/` as static.

### Session expiry is `timestamp` without time zone

- **File and line:** `db/migrations/0000_auth.sql` line 19 (`session.expires_at`), and the other `timestamp` columns in that file. `db/schema/auth.ts` matches the SQL.
- **Problem:** The foundation plan kept the Better Auth CLI types. Expiry is a clock time with no offset. `account.updated_at` (line 14) and `session.updated_at` (line 21) are `NOT NULL` with no SQL default. Better Auth sets those on write. A raw insert that omits them fails.
- **How it could be exploited:** If the Node process and Postgres `TimeZone` ever disagree, a session can expire earlier or later than the configured lifetime. It does not skip authentication. Deleting a user cascades to `session` and `account`.
- **Proposed fix:** Leave `0000_auth.sql` as it is. A later migration can move expiry to `timestamptz` if you want that guarantee. Do not edit the applied file.
- **Performance:** None. A later column type change needs its own migration review.

## Hardening candidates

These are listed for a later decision. They are not proposed as changes in this pass.

### Nonce CSP: keep the static policy

Context7 `/vercel/next.js/v16.2.9` (newest indexed tag; the app is 16.4.3) says a nonce in `proxy.ts` forces every page to render dynamically, disables static optimization and ISR, and is incompatible with Partial Prerendering. The installed build still prerenders `/`.

`/sign-in` and `/app` are already dynamic because they call `getSession`, which reads `headers()`. A nonce would not change that. It would make `/`, and any later public page, dynamic too.

`'unsafe-inline'` on scripts means a future injection runs. The current inline script is `next-themes`, which can take a nonce. Adopting the nonce means a `proxy.ts`, a per-request nonce, and passing that nonce into `ThemeProvider`.

Recommendation: keep the static policy. Adopt a nonce when a page renders untrusted HTML, and accept that `/` stops being static. Do not implement either change without a new approval.

### Account lockout and password policy

`minPasswordLength` is 12 (`lib/auth.ts` line 45). The library max is 128. There is no composition rule and no lockout. The seed uses the same length floor, refuses a short password with a fixed message, and never prints the password. A lost password has no reset flow. That is an open product decision, not a bug in this code.

### Session lifetime

Installed defaults, because `lib/auth.ts` sets no `session` block: `expiresIn` 604800 (7 days), `updateAge` 86400 (1 day). Confirmed in `better-auth` `dist/context/create-context.mjs` lines 147–148. A stolen cookie works until expiry or until sign-out deletes the server session. Shortening `expiresIn` is one column write on login and on refresh. It does not add a read to ordinary page views beyond the existing `getSession`.

### Memory rate limit on more than one instance

`storage: "memory"` is a process-local map (`lib/auth.ts` line 49). One Node process is what this app runs. A second instance would have its own counters, so the limits would not add up. A shared store is a keyed increment, not a per-row auth query. Pair it with the `X-Forwarded-For` fix above. Do not disable the limiter to avoid the shared bucket.

## Performance of the security code

- `getSession` is `cache()` around one `auth.api.getSession` (`lib/session.ts` lines 10–14). Callers are `app/sign-in/page.tsx` line 16 and `app/app/page.tsx` line 15. `app/layout.tsx` and `app/page.tsx` do not call it.
- `npm run build` marks `/` and `/icon.svg` static, and `/sign-in`, `/app`, and `/api/auth/[...all]` dynamic. The security headers did not force `/` dynamic.
- The pool is `max: 10` (`db/index.ts` line 24). Env parsing is cached and does not open a connection (`lib/env.ts`).
- Joins are enabled (`lib/auth.ts` lines 37–40). There is no per-row auth lookup. There are no domain rows yet.

## Sign-up lock

`isSignUpDisabled` returns true whenever `NODE_ENV === "production"`, and only then looks at `BOOTSTRAP_SIGN_UP` (`lib/auth.ts` lines 21–27 and 44). The seed sets the flag only after it refuses production and a non-local database, and only then imports `lib/auth.ts` (`db/seed.ts` lines 154–168).

The flag is assigned only in `db/seed.ts`. It is not a key in `.env`, `.env.example`, compose, or package scripts. There is no CI workflow and no Dockerfile. Name search only; values were not printed.

`POST /api/auth/sign-up/email` on the running dev server returned 400 `EMAIL_PASSWORD_SIGN_UP_DISABLED`.

A production process with the flag set was not booted. The production branch is the first line of `isSignUpDisabled` and does not read the flag.

## Seed host check

Compared with postgres.js 3.4.9 `parseUrl` / `parseOptions` (`node_modules/postgres/src/index.js` lines 430–466 and 537–558). The dial host is the URL host, or every comma-separated host. A query `host` or `hostaddr` is a startup parameter, not the address it connects to. `PGHOST` is used only when the URL has no host; the seed refuses an empty host.

No shape both passed the seed allowlist and dialed a non-local host. Refused, fail-closed: a `#` fragment hiding another host, userinfo such as `localhost@evil.com`, a host that only starts with `localhost`, an encoded comma, a comma-separated remote host, `::1`, a trailing-dot name, `0.0.0.0`, and a decimal loopback.

`LOCALHOST` is also refused. On Node v22.22.1, `new URL` does not lowercase the hostname of a `postgresql:` URL (`http:` URLs are lowercased). The security review said the non-comma path allows `LOCALHOST` because the parser lowercases it. That is not what this Node does. postgres.js would dial the name `LOCALHOST`, which DNS treats as loopback, so the seed is stricter than the driver. Not a bypass.

The seed calls `auth.api.signUpEmail` (`db/seed.ts` lines 171–177). It does not insert a hash. Better Auth hashes with scrypt (`better-auth` `dist/crypto/password.mjs`). The seed was not executed in this audit.

## Database roles

Read-only checks on the running local container `nahala-postgres-1`:

- `nahala_app` and `nahala_migrator`: `rolsuper` false, `rolcreaterole` false, `rolcreatedb` false, login true.
- `nahala_app` does not have `CREATE` on schema `public`. `nahala_migrator` does.
- `nahala_app` has `SELECT`, `INSERT`, `UPDATE`, and `DELETE` on `user`, `session`, `account`, and `verification`. It does not have `TRUNCATE` or `REFERENCES` on those tables.
- `DATABASE_URL` user is `nahala_app`, host `127.0.0.1`. `MIGRATE_DATABASE_URL` user is `nahala_migrator`, same host. Passwords were not printed. The image superuser `postgres` still exists for cluster boot. Application code does not read `POSTGRES_PASSWORD`.

`import "server-only"` is the first import of `db/index.ts`, `lib/env.ts`, `lib/auth.ts`, and `lib/session.ts`. The client components import `lib/auth-client.ts` only. No configured secret value appears under `.next/static`.

## HTTP checks on the dev server

`GET /`, `GET /sign-in`, `GET /app`, and `GET /api/auth/ok` all sent the dev CSP, `nosniff`, `Referrer-Policy`, and `X-Frame-Options: DENY`. None sent `Strict-Transport-Security`. `GET /app` without a cookie was 307 to `/sign-in`. With a session it was 200. After a JSON sign-out it was 307 to `/sign-in` again.

Dev CSP:

```
default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'
```

The production build wrote this policy into `.next/routes-manifest.json` (not observed on a live `next start` socket):

```
default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests
```

plus `Strict-Transport-Security: max-age=63072000; includeSubDomains`. No `preload`. No `'unsafe-eval'`.

`POST /api/auth/sign-in/email` with `Origin: https://evil.example` returned 403 `INVALID_ORIGIN`. The same route with `callbackURL: https://evil.example/phish` and a trusted origin returned 403 `INVALID_CALLBACK_URL`. Responses did not include `Access-Control-Allow-Origin`. An unknown email returned 401 `INVALID_EMAIL_OR_PASSWORD` and set no cookie.

There is one route handler, `app/api/auth/[...all]/route.ts`, which delegates to Better Auth. There are no Server Actions and no `/api/v1` routes yet.

## Migration

Verdict from the migration review, confirmed against the SQL and `db/schema/auth.ts`: safe to have applied. `0000_auth.sql` only creates the four Better Auth tables, two foreign keys (`ON DELETE cascade`), and indexes. No `DROP`, `TRUNCATE`, or type change. The snapshot and the schema agree. Do not edit the file now that it has been applied.

Residual items are the Low timestamp finding above, no unique constraint on `account (provider_id, account_id)` (the CLI schema does not declare one; sign-up is off), and no row-level security. None of those are a reason to rewrite this migration.

## Secrets and git

`.gitignore` ignores `.env*` except `.env.example`. `.env.example` values are empty or `http://localhost:3000`. The example URL comments use the placeholder `<password>`.

Git history: `.env` was never committed. Assignments of `DATABASE_URL`, `BETTER_AUTH_SECRET`, `SEED_USER_PASSWORD`, and the role passwords appear only as empty keys in `.env.example`. No private-key or common token-prefix matches in history. `package-lock.json` is tracked. The working tree was clean at the end of this audit.

`STATE.md` says tasks 1–6 are still uncommitted. `git log` shows commit `a190d22` for those steps, and `git status` was clean. The code and git are the source of truth. This pass did not edit `STATE.md`.

## Commands

`npm run typecheck` (exit 0):

```
> nahala@0.1.0 typecheck
> tsc --noEmit
```

`npm run lint` (exit 0):

```
> nahala@0.1.0 lint
> eslint
```

`npm audit` (exit 1): 4 moderate, 0 high, 0 critical. Packages: `esbuild` 0.18.20 (nested), `@esbuild-kit/core-utils`, `@esbuild-kit/esm-loader`, `drizzle-kit`. Advisory GHSA-67mh-4wv8-2f99.

`npm run build` (exit 0), Next.js 16.4.3:

```
Route (app)
┌ ○ /
├ ○ /_not-found
├ ƒ /api/auth/[...all]
├ ƒ /app
├ ○ /icon.svg
└ ƒ /sign-in

○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand
```

## Documentation

- Better Auth: Context7 `/better-auth/better-auth/v1.6.23`. Newest indexed tag. Installed package is 1.7.14. The v1.6.23 cookie page says `Secure` follows production mode. Installed `dist/cookies/index.mjs` follows the base URL scheme. Rate-limit defaults in that doc (off in development, memory storage, sign-in special-cased) match the installed merger: `enabled` defaults to production unless set, and this app sets `enabled: true`.
- Next.js: Context7 `/vercel/next.js/v16.2.9`. Newest indexed tag. Installed package is 16.4.3. The CSP guide's nonce section says nonces force dynamic rendering. The non-nonce example allows `'unsafe-inline'` on scripts and styles. That matches `next.config.ts`.

## Reviewed

`lib/auth.ts`, `lib/auth-client.ts`, `lib/session.ts`, `lib/env.ts`, `app/api/auth/[...all]/route.ts`, `app/sign-in/page.tsx`, `app/sign-in/sign-in-form.tsx`, `app/app/page.tsx`, `app/app/sign-out-button.tsx`, `app/layout.tsx`, `app/page.tsx`, `next.config.ts`, `instrumentation.ts`, `instrumentation-node.ts`, `db/index.ts`, `db/seed.ts`, `db/register-seed.mjs`, `db/schema/auth.ts`, `db/schema/index.ts`, `db/migrations/0000_auth.sql`, `db/migrations/meta/0000_snapshot.json`, `drizzle.config.ts`, `docker-compose.yml`, `docker/postgres/init-roles.sh`, `.env.example`, `.gitignore`, `package.json`, `package-lock.json` (audit and esbuild versions only).

Installed Better Auth 1.7.14 cookie, secret selection, rate limit, IP header, sign-up, sign-in, sign-out, and origin check. postgres.js 3.4.9 URL parsing. Live dev responses for headers, sign-up, origin, callback URL, rate limit, cookie flags, and sign-out. Local role and grant catalog. Git history for secret-shaped strings. Client build output for configured secret values.

## Not reviewed

- Production host, firewall, TLS termination, and whether the public site is HTTPS only.
- Backups and restore tests. `STATE.md` says these are not set up.
- How the first user is created on the production server. The seed refuses production. That question is still open.
- A production compose file. None exists, so "production publishes no database port" was not observed. It is a requirement for that future file.
- Live headers from `next start`. The production policy was read from `.next/routes-manifest.json` after `npm run build`.
- A production process with `BOOTSTRAP_SIGN_UP=1`. The source returns sign-up disabled before it reads the flag. That process was not started.
- The seed script was not executed, so the silent password prompt and the production exit were not re-run. The host check was compared to postgres.js in a local script that does not connect.
- Domain tables, services, `/api/v1`, roles, email verification, and password reset. They are not in this foundation.
- Whether the one leftover local session row should be removed. This pass did not delete it.
