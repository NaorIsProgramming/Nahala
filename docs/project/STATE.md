# Project state

> A short map of the project for any new chat. The code is the source of truth.
> Keep this under ~150 lines. Edit in place; do not turn it into a changelog.
> Never put secrets, credentials, or server addresses here.

Last updated: 2026-10-26

## What this app is

Nahala (Hebrew: נחלה) is a Hebrew-language management application for an agricultural packing facility. It handles pallets of fruit through two different sorting and packaging steps, including the creation of pallets and dedicated sorting stages. It produces reports and statistics on command. It also exposes an API that can perform every action available through the GUI.

Users and roles: <TODO: who uses it (e.g. operators, supervisors, admins) and what each may do. Needed before designing auth and permissions.>

## Stack

- Next.js (App Router), React, TypeScript, Tailwind CSS
- Better Auth (self-hosted, no external auth service)
- PostgreSQL with Drizzle ORM
- Fully self-hosted. Deployment target: <TODO, e.g. VPS with Docker Compose>

## Current status

- Project folder is empty. Nothing is built yet.
- Not started: scaffold, database, auth, security baseline, all app features.

## Architecture map

Planned layout (update as it becomes real):

- `app/` : routes, layouts, route handlers
- `components/ui/` : generic reusable primitives
- `components/` or `features/<name>/` : feature-specific components
- `db/index.ts` : the single shared database client (server-only)
- `db/schema/` : Drizzle table definitions, split by domain
- `lib/auth.ts` : Better Auth server instance
- `lib/auth-client.ts` : Better Auth client
- `docs/project/` : this file, plans, and task briefs

## Key decisions

- 2026-10-26 Fully self-hosted, no third-party backend services, because the owner wants to control all data and infrastructure.
- 2026-10-26 Better Auth over Auth.js/Clerk/Supabase Auth, because it runs inside the app, stores data in our own database, and Auth.js is in maintenance mode.
- 2026-10-26 PostgreSQL + Drizzle over Prisma, because the schema is plain TypeScript and it pairs well with Better Auth's Drizzle adapter.
- 2026-10-26 PostgreSQL is never exposed to the internet. Only the app server has public ports.
- 2026-10-26 Library docs are pulled from Context7 instead of relying on model memory.

## Conventions not obvious from the code

- Database code is server-only. Never import `db` into client components.
- Schemas for user-submitted data omit or allowlist server-controlled fields (id, timestamps, userId, role).
- Security audit procedure lives in `.cursor/rules/security-audit.mdc` (invoke with `@security-audit`).
- The UI is Hebrew and RTL (`lang="he" dir="rtl"`), with light and dark themes. All UI follows `.cursor/rules/brand-design.mdc`, the tokens in `app/brand.css`, and the logo files in `public/brand/`. User-facing text is Hebrew; code, identifiers and API field names are English.
- Every action available in the GUI (creating pallets and sorting stages, reports, etc.) must also be available through the API (`/api/v1`). Business logic lives once, in plain functions in `lib/services/` (one file per domain area); the UI and API entry points are thin wrappers. Details are in the "Services and API parity" section of `.cursor/rules/nextjs-react-tailwind-ts.mdc`.

## Known issues and risks

- None yet. The owner has not set up backups or the production server.

## Next up

1. Define user roles, the domain model (pallets, the two sorting and packaging stages, reports), and how API clients authenticate.
2. Scaffold the Next.js project and commit it.
3. Add PostgreSQL (Docker Compose, not publicly exposed) and Drizzle.
4. Add Better Auth with the Drizzle adapter.
5. Add the security baseline (headers, env validation, rate limiting).
6. Build features.

## Commands

- Not set up yet. Add dev, type check, lint, test, and migration commands once the scaffold exists.
