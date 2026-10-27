# 04 — Hebrew sign-in, sign-out, and a protected page

Status: not started. Depends on task 03.

## Goal

A Hebrew sign-in page, a sign-out control, a session helper fetched once per request, and a protected placeholder. Successful sign-in waits for task 06. This task proves the closed door.

## Read first

- `docs/project/STATE.md`
- `docs/project/plans/foundation.md` (Better Auth pages and session)
- `.cursor/rules/brand-design.mdc`
- `.cursor/rules/nextjs-react-tailwind-ts.mdc` (Server Components, auth session)
- `app/layout.tsx`, `app/page.tsx`, `app/brand.css`, `components/theme-toggle.tsx`, `components/brand/logo.tsx`, `lib/auth.ts`, `lib/utils.ts`

Look up Better Auth 1.7 `createAuthClient` and `auth.api.getSession({ headers: await headers() })` before writing the client and the session helper.

## Acceptance

- `/sign-in` shows Hebrew labels, is RTL, and the theme toggle works in light and dark. Check this in the browser, not only by reading the markup.
- `GET /app` while signed out redirects to `/sign-in`.
- A wrong password shows a Hebrew error and does not set a session cookie.
- `/` is still the public home page and is still static in `npm run build` output.
- `npm run typecheck`, `npm run lint`, and `npm run build` pass.
- The security reviewer has reviewed the session helper and the redirect.

## Scope

Create:

- `lib/auth-client.ts` (browser client only)
- `lib/session.ts` with `import "server-only"`, wrapping `getSession` in React `cache()`
- `app/sign-in/page.tsx` and a small client form leaf
- `app/app/page.tsx` (the protected placeholder)
- A sign-out control on `/app`

## Constraints

- Do not call `getSession` from `app/layout.tsx`. That would make `/` dynamic.
- `/sign-in` may call the session helper to redirect an already-signed-in user to `/app`. That makes `/sign-in` dynamic. That is acceptable. `/` must stay static.
- The form leaf is the only new client component. It calls `authClient.signIn.email`. Sign-out calls `authClient.signOut`.
- `lib/auth-client.ts` must not import `db`, `lib/auth.ts`, `lib/session.ts`, or `server-only`.
- Hebrew UI, logical Tailwind (`ms-*`, `ps-*`, `text-start`). Brand tokens only (`bg-background`, `bg-surface`, `text-foreground`, `text-muted`, `bg-primary text-primary-foreground`, `border-input`, `text-danger`). No hex, no `gray-*` / `blue-*`, no `dark:` color overrides.
- Real `<form>` or `<button>`, labels on both fields, errors with `aria-invalid` and `aria-describedby`, visible `focus-visible` ring, targets at least 44px. Reuse `ThemeToggle` and `Logo`. Do not build a component library.
- Copy to use: title `כניסה`, email label `דוא״ל`, password label `סיסמה`, submit `כניסה`, sign-out `יציאה`, protected heading `אזור מוגן`. Wrong-credentials message does not say which field failed, for example `הדוא״ל או הסיסמה שגויים`.
- Show the signed-in name inside `<bdi>`.
- No roles, no registration link, no password-reset link.

## Security and performance

- The protected page checks the session on the server and `redirect()`s. Hiding a link is not the check.
- `cache()` is so one request does not call `getSession` twice. Do not fetch the session in a loop.
- Do not store the session in `localStorage`.

## Do not touch

CSP, rate limits, the seed, the auth schema, compose.

## Report when done

Files changed, browser results for `/sign-in` (both themes), the redirect, the failed sign-in, the build's static/dynamic mark for `/` and `/app`, and typecheck, lint, and build output. Do not start task 05.
