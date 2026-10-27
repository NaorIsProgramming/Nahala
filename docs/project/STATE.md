# Project state

> A short map of the project for any new chat. The code is the source of truth.
> Keep this under ~150 lines. Edit in place; do not turn it into a changelog.
> Never put secrets, credentials, or server addresses here.

Last updated: 2026-10-27

## What this app is

Nahala (Hebrew: נחלה) is a Hebrew-language management application for an agricultural packing facility. It handles pallets of fruit through two different sorting and packaging steps, including the creation of pallets and dedicated sorting stages. It produces reports and statistics on command. It also exposes an API that can perform every action available through the GUI.

Users and roles: <TODO: who uses it (e.g. operators, supervisors, admins) and what each may do. Needed before designing auth and permissions.>

## Stack

- Next.js 16.4.3 (App Router), React 19.3.0, TypeScript, Tailwind CSS 4.3.3
- Better Auth (self-hosted, no external auth service) — not installed yet
- PostgreSQL with Drizzle ORM — not installed yet
- Fully self-hosted. Deployment target: <TODO, e.g. VPS with Docker Compose>

## Current status

- Scaffold is in place: Hebrew RTL shell, Rubik, brand tokens, logo, and a light / dark / system toggle. The home page is a placeholder.
- Foundation plan approved and briefs written (`docs/project/plans/foundation.md`, `docs/project/tasks/`). Implementation has not started.
- Not started: database, auth, security baseline, all app features.

## Architecture map

What exists now:

- `app/layout.tsx`, `app/page.tsx`, `app/globals.css` : root shell and placeholder home page
- `app/brand.css` : Tailwind v4 theme tokens (light and dark)
- `app/icon.svg` : favicon
- `public/brand/` : `logo-mark.svg` and `logo-mark-dark.svg`
- `components/brand/logo.tsx` : logo, switched with CSS for dark mode
- `components/theme-toggle.tsx` : light / dark / system toggle
- `lib/utils.ts` : `cn()` helper
- `docs/project/` : this file, plans, and task briefs

Planned, not created yet:

- `components/ui/` : generic reusable primitives
- `features/<name>/` : feature-specific components
- `db/index.ts` : the single shared database client (server-only)
- `db/schema/` : Drizzle table definitions, split by domain
- `lib/auth.ts` : Better Auth server instance
- `lib/auth-client.ts` : Better Auth client
- `lib/services/` : one plain function file per domain area

## Key decisions

- 2026-10-26 Fully self-hosted, no third-party backend services, because the owner wants to control all data and infrastructure.
- 2026-10-26 Better Auth over Auth.js/Clerk/Supabase Auth, because it runs inside the app, stores data in our own database, and Auth.js is in maintenance mode.
- 2026-10-26 PostgreSQL + Drizzle over Prisma, because the schema is plain TypeScript and it pairs well with Better Auth's Drizzle adapter.
- 2026-10-26 PostgreSQL is never exposed to the internet. Only the app server has public ports.
- 2026-10-26 Library docs are pulled from Context7 instead of relying on model memory.
- 2026-10-26 Scaffold uses Tailwind v4 (CSS-first tokens in `app/brand.css`) and `next-themes` with `attribute="class"`, because dark mode is a `.dark` class on `<html>`.
- 2026-10-26 `next.config.ts` sets `agentRules: false`, so `next dev` does not generate `AGENTS.md`.
- 2026-10-27 Dev Postgres is `postgres:18`, volume mounted at `/var/lib/postgresql` (`PGDATA` is `/var/lib/postgresql/18/docker`). Dev compose publishes `127.0.0.1:5432:5432` only. Production compose publishes no database port and pins an exact image version.
- 2026-10-27 Public sign-up stays off. The local bootstrap user is created only by a seed that calls Better Auth's API. No roles in this work. How the first production user is created belongs in the deployment plan.
- 2026-10-27 Static CSP, with `'unsafe-inline'` only on scripts and styles, so `next-themes` keeps working. A nonce CSP is reconsidered in the foundation audit and is not adopted without a new approval.

## Conventions not obvious from the code

- Database code is server-only. Never import `db` into client components.
- Schemas for user-submitted data omit or allowlist server-controlled fields (id, timestamps, userId, role).
- Security audit procedure lives in `.cursor/rules/security-audit.mdc` (invoke with `@security-audit`).
- The UI is Hebrew and RTL (`lang="he" dir="rtl"`), with light and dark themes. All UI follows `.cursor/rules/brand-design.mdc`, the tokens in `app/brand.css`, and the logo files in `public/brand/`. User-facing text is Hebrew; code, identifiers and API field names are English.
- Every action available in the GUI (creating pallets and sorting stages, reports, etc.) must also be available through the API (`/api/v1`). Business logic lives once, in plain functions in `lib/services/` (one file per domain area); the UI and API entry points are thin wrappers. Details are in the "Services and API parity" section of `.cursor/rules/nextjs-react-tailwind-ts.mdc`.

## Known issues and risks

- The owner has not set up backups or the production server.
- Static CSP will include `'unsafe-inline'` for scripts and styles so the `next-themes` script can run. A nonce policy is a later decision; it would force dynamic rendering.

## Next up

1. Commit the scaffold. It is still uncommitted. That is not one of the foundation tasks.
2. Implement the foundation briefs in order, starting with `docs/project/tasks/01-postgres-and-env.md`.
3. Then define roles, the domain model, and how API clients authenticate.
4. Deployment plan: how the first user is created on the production server, and an exact Postgres image pin with no published database port.
5. Build features.

## Commands

- `npm run dev` — dev server
- `npm run build` — production build
- `npm run start` — serve the production build
- `npm run lint` — ESLint
- `npm run typecheck` — `tsc --noEmit`
- Tests: not set up yet
- Migrations: not set up yet
