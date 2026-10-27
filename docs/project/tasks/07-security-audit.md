# 07 — Security audit

Status: not started. Depends on task 06.

## Goal

A read-only findings report for the foundation, using `.cursor/rules/security-audit.mdc`. Reconsider a nonce-based CSP in that report. Do not change code in this task.

## Read first

- `docs/project/STATE.md`
- `docs/project/plans/foundation.md`
- `.cursor/rules/security-audit.mdc`
- The foundation diff: `docker-compose.yml`, `docker/postgres/`, `db/`, `lib/env.ts`, `lib/auth.ts`, `lib/auth-client.ts`, `lib/session.ts`, `db/seed.ts`, `app/api/auth/`, `app/sign-in/`, `app/app/`, `next.config.ts`, `instrumentation.ts` if it exists, `.env.example`

## Acceptance

- Findings grouped by severity (Critical, High, Medium, Low). Each one has file and line, what is wrong, how it could be exploited, and a proposed fix. An empty list is valid only with a coverage note.
- `npm audit`, `npm run typecheck`, and `npm run lint` were run, and the real output is in the report.
- The report says what was not reviewed: production host, firewall, backups, and how the first user will be created on the production server.
- The report reconsiders a nonce-based CSP: the `next-themes` inline script, what `'unsafe-inline'` allows, and that a nonce in `proxy.ts` forces every page to render dynamically. Recommend adopt or keep the static policy. Do not implement either recommendation.
- No files changed except the written report if you put it under `docs/project/`. Prefer the chat report. Do not edit application code.

## Checks that matter here

- Postgres is loopback-only in the dev compose file. The app role is not a superuser. The volume is `/var/lib/postgresql`.
- Sign-up is disabled on the running server. The seed refuses production and non-local hosts, calls Better Auth's API, and does not print the password.
- Session cookies are `HttpOnly`, `SameSite=Lax`, and not `Secure` on local `http`.
- `getSession` is not in the root layout. `/` stayed static.
- Headers match the approved static CSP. No nonce was added.
- No secrets in git, in `NEXT_PUBLIC_`, or in logs you produce. Name variables. Do not print values.
- `npm audit` covers direct and transitive dependencies added for the foundation.

## Security and performance

- Read-only. No migrations, no `docker compose down -v`, no production database.
- For any proposed fix, say whether it adds a query, disables static rendering, or grows the client bundle. The nonce CSP does disable static rendering. Say that plainly.

## Do not touch

Application code, compose, schema, dependencies. Fixes wait for a separate approval.

## Report when done

The findings list, command output, coverage gaps, and the nonce recommendation. Do not start a fix.
