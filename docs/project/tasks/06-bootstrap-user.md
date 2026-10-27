# 06 — Bootstrap user

Status: not started. Depends on task 05.

## Goal

One local ordinary user, created only by a seed that calls Better Auth's API. The running app still rejects public sign-up, including in development.

## Read first

- `docs/project/STATE.md`
- `docs/project/plans/foundation.md` (Bootstrap user, Open questions)
- `.cursor/rules/nextjs-react-tailwind-ts.mdc` (seed, auth, server-only)
- `lib/auth.ts`, `lib/session.ts`, `lib/env.ts`, `app/sign-in/page.tsx`, `app/app/page.tsx`, `package.json`

Look up Better Auth 1.7 `auth.api.signUpEmail` and `emailAndPassword.disableSignUp` before changing the config. Confirm whether `signUpEmail` honors `disableSignUp`. The seed must use a path the installed API actually allows after the checks below. If the only working call is something other than `signUpEmail`, it still has to be Better Auth's own API. Do not hash the password or insert rows yourself. If no API can create a user while public sign-up stays off, stop and report that. Do not fall back to SQL.

## Acceptance

- `npm run db:seed` creates the user through Better Auth's API. A second run exits 0 and does not create a duplicate.
- The password is never printed: not by the prompt, not in logs, not in an error. There is no default password in code, `.env.example`, or the script.
- When `SEED_USER_PASSWORD` is unset, the script prompts and the terminal does not echo the typing. No new prompt package.
- `NODE_ENV=production npm run db:seed` exits non-zero and creates nothing.
- A `DATABASE_URL` whose host is not `localhost` or `127.0.0.1` exits non-zero and creates nothing.
- In the browser, that user can sign in, see `/app` with their name, and sign out. After sign-out, `/app` redirects to `/sign-in`. Check both themes on `/app`.
- `POST /api/auth/sign-up/email` against the running app is still rejected. `BOOTSTRAP_SIGN_UP` is not set in the server's environment.
- `npm run typecheck`, `npm run lint`, and `npm run build` pass.
- The security reviewer has reviewed the seed and the `disableSignUp` branch.

## Scope

- `db/seed.ts`
- `db:seed` script in `package.json`
- The `disableSignUp` branch in `lib/auth.ts`
- `.env.example` entries for `SEED_USER_EMAIL` and `SEED_USER_PASSWORD`, empty, with a comment that the password may be left empty to prompt

## Constraints

- No role, no admin plugin, no `auth create-admin`.
- Order of checks, then the call:

  1. Exit non-zero if `NODE_ENV` is `production`.
  2. Exit non-zero unless the `DATABASE_URL` host is `localhost` or `127.0.0.1`.
  3. Only then set a process-local flag (name it `BOOTSTRAP_SIGN_UP`) in that process. Do not put the flag in `.env` or `.env.example`. Next.js would load it and turn sign-up on.
  4. `SEED_USER_EMAIL` is required from the environment. No default. Exit if it is missing. The email may be printed. The password may not.
  5. Password from `SEED_USER_PASSWORD` or a silent prompt. Refuse fewer than 12 characters. Never echo it.
  6. Dynamic-import `lib/auth.ts` only after those checks, then call `auth.api.signUpEmail`.

- `disableSignUp` is true whenever `NODE_ENV` is `production`, even if the flag is set. In development it is false only when the flag is `1`. The Next.js server never sets the flag, so `next dev` keeps sign-up off.
- An existing email is success. Map that API error to a fixed message. Do not print the response body.
- Node is v22.22.1. Run with type stripping and `--conditions=react-server` so the script can import `server-only` modules. No `tsx`. The script uses relative imports if path aliases do not resolve under plain Node.
- Do not solve production user creation. The deployment plan owns that. This script refuses production.
- Do not log `DATABASE_URL`, the secret, or the password.

## Security and performance

- The seed is a one-shot process. It must not leave sign-up enabled for the server you use in the browser check.
- Creating one user is one API call. Do not bulk-insert.
- A second run must not reset the password.

## Do not touch

CSP, compose, domain tables, roles, the sign-in copy except if the browser check shows a bug you caused.

## Report when done

Files changed, proof the user row exists without printing the password, second-run and refusal results, the sign-up rejection against the running app, and the browser sign-in / sign-out result. Include typecheck, lint, and build output. Do not start task 07.
