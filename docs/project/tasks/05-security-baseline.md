# 05 — Security baseline

Status: not started. Depends on task 04.

## Goal

Static security headers, auth rate limits that stay on in development, and a check that session cookies are `HttpOnly` and `SameSite=Lax`.

## Read first

- `docs/project/STATE.md`
- `docs/project/plans/foundation.md` (Security headers, rate limit, cookies)
- `.cursor/rules/nextjs-react-tailwind-ts.mdc` (Security headers)
- `next.config.ts`, `lib/auth.ts`, `app/layout.tsx`, `components/theme-toggle.tsx`

Look up Next.js 16.4.3 `headers()` in `next.config` before editing it. The plan's CSP notes were taken from the 16.2.9 docs. If 16.4.3 disagrees, follow 16.4.3 and say so. Look up Better Auth 1.7 rate-limit options before changing `lib/auth.ts`.

## Acceptance

- `curl -sI` on `/` includes `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and frame protection (`X-Frame-Options: DENY` and `frame-ancestors 'none'`). Local responses do not include `Strict-Transport-Security`.
- The CSP has no nonce. There is no `proxy.ts`. `'unsafe-inline'` appears only on `script-src` and `style-src`. These are present and strict: `default-src 'self'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `font-src 'self'`, `img-src 'self'`, `connect-src 'self'`. Development may add `'unsafe-eval'` to `script-src` only.
- In the browser, `/` and `/sign-in` still load, and the theme toggle still works in light and dark. If a directive blocks a resource, do not widen the policy. Report the console error and stop.
- Repeated `POST /api/auth/sign-in/email` eventually returns 429. The built-in `/sign-in/email` limit is 3 requests per 10 seconds. Keep that, and set `/sign-up/email` at least that strict. Do not invent a looser window.
- A sign-in response's `Set-Cookie` is `HttpOnly` and `SameSite=Lax`. On local `http` it is not `Secure`.
- `npm run typecheck`, `npm run lint`, and `npm run build` pass. `/` is still static.
- The security reviewer has reviewed the header and rate-limit diff.

## Constraints

- Headers live in `next.config.ts` `headers()` for all routes. Do not add a nonce, and do not add `proxy.ts` or `middleware.ts`.
- `upgrade-insecure-requests` only when `NODE_ENV` is `production`. On local `http` it would send the browser to `https` and break `next dev`.
- HSTS only in production. No `preload`.
- Rate-limit storage is `memory`. Enabled in development so the 429 check is real. Do not add Redis or a database table for it.
- Cookie flags: keep Better Auth's defaults (`httpOnly`, `sameSite: lax`, `secure` only when the base URL is `https`). Set them explicitly only if the installed options document a field. Do not invent the field name. Do not force `Secure` on `http://localhost:3000`.
- `trustedOrigins` stays a single origin, the origin of `BETTER_AUTH_URL`.

## Security and performance

- `headers()` does not make routes dynamic. Do not "fix" CSP by calling `getSession` from the root layout.
- The limiter must not add a database query. Memory is the point, and it does not cover a second server process. That limit is accepted until deployment.
- Do not put the secret or database URL in the header config.

## Do not touch

The seed, auth tables, the sign-in layout beyond what a broken CSP forces you to report, roles.

## Report when done

The CSP value you shipped, `curl -sI` headers, the 429 status, the `Set-Cookie` flags, browser theme results, and typecheck, lint, and build output (including `/` still static). Do not start task 06.
