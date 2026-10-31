# Pallet intake

Status: approved 2026-10-31. Task 1 is built. Build the remaining briefs one chat at a time, in order, starting at `docs/project/tasks/09-pallet-set-schema.md`.

## Goal

The first domain feature: intake of pallet sets (תעודת כניסה), the reference lists they depend on, and an audit trail. A signed-in user can maintain growers and the type lists, record a set with or without pallets, add and remove pallets, edit the set, void it, and read a separate voided list. Net weight is calculated on the server. Numbers that collide return a stable error the sorting application can read later.

## Non-goals

- Package balances, reports, exports, and seasons. The schema only keeps those queries cheap.
- Linking a C set to the A pallets that fed it.
- A certificate that hands empty packages back to a grower.
- User management, the Better Auth admin plugin, and API-key installation.
- `/api/v1` routes. They wait on the authentication decision below. Approving this plan does not approve that choice.
- Un-voiding. The database must make it possible; the action is not built.
- A draft status. An empty set is an ordinary active set. There is no separate unpublished state.

## Docs used

Looked up in this planning session. Context7 has no Better Auth 1.7.14 tag and no Next.js 16.4.3 tag.

| Library | What was read | Version gap |
| --- | --- | --- |
| Drizzle ORM | Context7 `/drizzle-team/drizzle-orm/0.45.4`: `check()`, `unique()`, `index().where(sql)`, composite `foreignKey()`, `db.transaction()` | Matches installed `drizzle-orm@0.45.4`. The snippet for `index().where` is the partial-index API. Confirm `uniqueIndex().where()` against the installed types while generating. The migration must contain the `WHERE` clause. |
| Better Auth admin plugin | Context7 `/better-auth/better-auth` (current plugin docs): `user.role` string, default `user`, admins have `admin`. Also `banned`, `banReason`, `banExpires`, and session `impersonatedBy`. Role is `input: false`. | Installed package is 1.7.14. Do not install the plugin in this feature. |
| Better Auth API keys | Context7 `/websites/better-auth` (current site): `auth.api.createApiKey` and `auth.api.verifyApiKey`. A key belongs to a `userId`, is hashed, and can carry rate limits and a permissions object. | Same version gap. Not installed until the decision below is approved. |
| Next.js | Context7 `/vercel/next.js/v16.2.9`: Server Functions return expected errors to `useActionState` (from `react`). Route Handlers export `GET` / `POST` / `PATCH`, `params` is a `Promise`, and `NextResponse.json(body, { status })` sets the status. | Installed Next.js is 16.4.3. This matches the project rules. No conflict to resolve. |

## Decisions

- Reference numbers and pallet numbers are positive integers. `"01"` is not a value. A later, richer pallet-number scheme is a todo. Reference numbers stay integers.
- Growers, yield types, package types, and pallet types are addressed by Nahala’s id. No external code column.
- Grower, kind, date, reference number, and the pallet rows may all change after a save. The audit trail records the change.
- A set may be created with no pallets and may later have none again. Creating the header, changing the header, adding pallets, and removing pallets are separate operations. The GUI and the API both have add and remove. A header update never adds or removes pallets, so a partial call cannot wipe pallets the caller did not mention. An empty active set still holds its reference number. Removing a pallet frees that pallet number for the grower immediately.
- Each set and each pallet has a UUID. People search and filter by the integer reference number and pallet number. Links, the API, and the audit trail use the UUID, because the integers can be reused after a void.
- Editing a pallet keeps its UUID. Removing a row and adding one, even with the same pallet number, creates a new UUID. The set keeps its UUID for life.
- A removed pallet is deleted from the live table inside the remove transaction. Its UUID and last values stay in the audit trail. Sets are voided, never deleted. Pallets cannot be added to or removed from a voided set.
- Net weight is integer grams and may be zero on any pallet. A negative result rejects an active save. A tare edit that would make a voided pallet negative stores net weight 0 and the new tare. Active pallets keep the tare from their last save until that set is saved again.
- Package types have a checkbox, `countsInGrowerInventory`, default on. Future grower package totals count a pallet only when the kind’s flow is `in` and this flag is on. Kind C is `none`, so it never counts.
- Limits by grower and by kind are enforced in this feature. So are a global read grant, a global write grant, and a write grant for each of the four reference lists. There is no screen to create users or to attach those grants. The bootstrap seed gives the existing local user one global write grant. A user with no grant rows sees nothing.
- Usual set size is about 40 pallets. The code has one path. One add or remove request above 500 pallets is rejected. A set can still grow past that by later requests.

## Design

### Kinds and package flow

One module, `lib/pallet-sets/kinds.ts`, with no database import, so the client and the server share it:

```ts
export const PACKAGE_FLOW = {
  A: "in",
  B: "in",
  C: "none",
} as const;
```

`in` means packages move from the grower to the packing house. `none` means the set does not move that balance. A later certificate adds a kind whose flow is `out`. Kind labels for the Hebrew UI live next to this constant. Queries that will one day sum packages take the `in` kinds from this object. They do not hardcode `"A"` and `"B"` in a second place.

The package-type flag is the other gate. Both have to pass. The flag does not make a C set count.

### Weights

Stored as integer grams. The screen shows kilograms, up to three decimal places, grouped with integer arithmetic in a shared formatter. No binary float.

`lib/pallet-sets/net-weight.ts` exports one function:

`grossWeightGrams - packageTareGrams * packageAmount - palletTareGrams`

The entry screen’s live preview calls that function with the tares loaded for the form. An active save calls the same function with the tares read from the database at save time, and stores that result plus those tare values. The client never sends net weight or tare. Zero is saved. A negative result is a validation error (`NET_WEIGHT_NEGATIVE`), not a 409.

The preview matches an active save. It does not clamp. Clamping exists only on the voided tare update below, which the entry screen does not perform.

Bounds, also enforced with checks: reference number and pallet number are integers `>= 1`; package amount is an integer `>= 1`; gross weight and both tares are integers `>= 0`. A practical cap (gross at most 100,000 kg, tare at most 100 kg, package amount at most 10,000) keeps the tare multiplication inside a 32-bit integer.

### Tare edits and voided pallets

Changing a package tare or a pallet tare runs one `UPDATE` for voided pallets of that type. It writes the new tare and sets net weight to `GREATEST(0, formula)`. Active pallets are not in that update. Nothing is loaded into JavaScript.

The pallet check constraint is the authority:

- stored net weight is `>= 0`
- when the pallet is not voided, stored net weight equals the formula
- when the pallet is voided, stored net weight equals `GREATEST(0, formula)`

Voiding an active pallet still satisfies the check, because its formula was already `>= 0`. A later un-void that only flips the flag fails the check when the formula is negative. That case is a todo, not a feature.

### Reference data

Tables: `growers`, `yield_types`, `package_types`, `pallet_types`.

Each has a UUID primary key, `created_at` and `updated_at` as `timestamptz`, a Hebrew `name`, and `is_active` (default true). Package types add `tare_grams` and `counts_in_grower_inventory` (default true). Pallet types add `tare_grams`. Names are unique among active rows of that table.

No hard delete. Deactivating hides a row from new sets. Existing pallets keep the foreign key (`ON DELETE RESTRICT`). Renaming does not touch pallets. A tare edit does, and only as described above.

### Pallet sets and pallets

`pallet_sets`:

- `id` UUID primary key
- `kind` text, check `IN ('A', 'B', 'C')`
- `reference_number` integer, check `>= 1`
- `grower_id` not null, foreign key to `growers`, `ON DELETE RESTRICT`
- `received_on` `date` (a calendar date, no time)
- `voided` boolean, default false
- `voided_at`, `voided_by` (nullable; `voided_by` references `user.id`, `ON DELETE RESTRICT`)
- `created_at`, `updated_at` `timestamptz`
- `created_by`, `updated_by` reference `user.id`, `ON DELETE RESTRICT`
- `revision` integer, starts at 1, incremented on every successful save and on void
- unique `(id, grower_id, voided)` so the pallet foreign key has a target
- partial unique index on `reference_number` where `voided = false`

`pallets`:

- `id` UUID primary key
- `set_id`, `grower_id`, `voided` — the service copies these from the set. The client does not send them
- composite foreign key `(set_id, grower_id, voided)` → `pallet_sets (id, grower_id, voided)` with `ON UPDATE CASCADE` and `ON DELETE RESTRICT`
- `pallet_number` integer, check `>= 1`
- `yield_type_id`, `package_type_id`, `pallet_type_id`, all `ON DELETE RESTRICT`
- `package_amount`, `gross_weight_grams`, `package_tare_grams`, `pallet_tare_grams`, `net_weight_grams`
- `created_at`, `updated_at`
- partial unique index on `(grower_id, pallet_number)` where `voided = false`
- the net-weight check from above

The generated SQL must show `ON UPDATE CASCADE`. Drizzle 0.45.4’s `foreignKey()` helper is what the schema uses; if the installed call shape differs, match the types, and do not migrate until the SQL is right. A partial unique index uses `uniqueIndex().where()` when the types allow it. If `generate` drops the `WHERE`, fix the schema and generate again. Do not hand-edit an applied migration.

Voiding is one transaction: set `voided`, `voided_at`, and `voided_by`, increment `revision`. The cascade copies `voided` onto the pallets, which drops them from both partial unique indexes. The reference number and those pallet numbers can be used on a new active set. Lookup by reference number is `voided = false` only. Two voided sets may share a number.

Changing `grower_id` cascades onto the pallets. The partial unique index then applies to the new grower. The service checks first and returns the structured conflict; the constraint is the authority if two requests race.

### Indexes for lists and for later totals

Active list and filters (kind, grower, date range, exact reference number), all partial `WHERE voided = false`:

- unique `(reference_number)`
- `(received_on, id)` for the default order
- `(grower_id, received_on)`
- `(kind, received_on)`

Voided list: `(received_on, id) WHERE voided = true`.

Detail and the set-to-pallet join: `pallets (set_id)`.

Tare recalculation: `pallets (package_type_id) WHERE voided` and `pallets (pallet_type_id) WHERE voided`.

Later per-grower package totals (flow `in`, flag on, not voided) join sets to pallets on `set_id` and filter `kind` and `grower_id`. The kind and grower indexes above, plus `pallets (set_id, package_type_id)`, are the ones that serve that query. Kind and date stay on the set. Copying them onto every pallet would be a second source of truth; the join is on the primary key and the tables are small.

Later per-kind / date / yield totals use `pallet_sets (kind, received_on) WHERE voided = false` and `pallets (set_id, yield_type_id)`.

### Audit trail

Tables are created with the set migration so the save transaction can write them. The history screen is a later task.

`audit_events`: UUID, `at` `timestamptz`, `actor_user_id`, `action` (`created`, `updated`, `voided`, `tare_changed`), and a `jsonb` summary of what changed. Append-only. `created_at` / `updated_at` exist because every table has them; rows are not updated.

`audit_subjects`: `(event_id, subject_type, subject_id)` primary key, index `(subject_type, subject_id, event_id)`. Subject types: `pallet_set`, `pallet`, `grower`, `yield_type`, `package_type`, `pallet_type`.

One save inserts one event and a bulk insert of subject rows: the set, plus each pallet that was inserted, updated, or removed. The summary stores a compact diff (header fields that changed, added pallets, changed fields, removed pallets with their last number and weights). It does not store a copy of unchanged rows. The list and the detail screen do not read these tables. History is a separate indexed lookup, limited, only when that panel is opened.

A tare edit inserts one event whose subject is that package type or pallet type. It does not insert a subject row per voided pallet. A pallet’s own history shows set saves. The reason a voided net became 0 is the type’s tare event, correlated by time. That is deliberate: a tare correction must not write hundreds of audit rows.

### Access hook

`lib/access.ts`. Services take an `Actor` and call this module. No second copy of the check. Every set query adds the predicate from `scopeForSets` in the same `WHERE`. Rows are not loaded and then filtered in JavaScript.

```ts
type Grant =
  | { scope: "global"; access: "read" | "write" }
  | {
      scope: "palletSets";
      access: "read" | "write";
      growerId: string | null;
      kind: "A" | "B" | "C" | null;
    }
  | { scope: "reference"; table: ReferenceTable; access: "write" };

type Actor = { userId: string; grants: Grant[] };
```

Grants are rows in `access_grants` (`user_id`, `scope`, `access`, nullable `grower_id`, nullable `kind`, nullable `reference_table`, timestamps). Checks keep the columns consistent: a global row has no grower, kind, or table; a reference row has a table and no grower or kind; a pallet-set row has no table. Index `(user_id)`. `grower_id` references `growers` with `ON DELETE RESTRICT`. `user_id` references `user.id` with `ON DELETE RESTRICT`.

`getActor()` uses the cached session, then loads that user’s grants once per request. No session is rejected before the service runs. An empty grant list denies every read and write.

How several grants combine:

- A global write grant can read and write every set and every reference table.
- A global read grant can read every set and every reference list, and cannot write.
- A pallet-set grant matches a set when its grower equals the set’s grower, or the grant’s grower is null, and its kind equals the set’s kind, or the grant’s kind is null. Null on the grant means “all” for that field. It does not allow a set with no grower or no kind. `pallet_sets.grower_id` and `pallet_sets.kind` stay `NOT NULL`. A grant with both fields null matches every set and does not grant reference-table edits.
- Several pallet-set grants are a union. A set the user can see matches at least one of them, or a global grant.
- Write wins over read. If any matching grant is write, the user can change that set. If the only matches are read, the write returns `READ_ONLY`.
- A reference grant can write that one table and read it. It does not reveal sets or the other tables.
- Creating a set, or changing its grower or kind, requires a write grant that matches the new grower and kind as well as the current one. A change that would leave the write scope returns a generic Hebrew denial and does not say whether the destination grower exists. A set the user cannot see returns `NOT_FOUND`, the same as a missing id.

The set-form grower dropdown lists active growers the actor may use: every active grower when a matching grant has a null grower (or the actor is global), otherwise only the growers named on their grants. Yield types, package types, and pallet types stay the full active list for anyone who can read a set. The reference admin screens stay behind a global write grant or that table’s reference grant.

The bootstrap seed inserts one global write grant for the local user, and does nothing on a later run if that grant is already there. This feature has no page for users or grants.

Better Auth’s admin plugin is still the future representation of a person who is an admin: `user.role` is `admin`, the field is not client-writable, and `adminRoles` defaults to `["admin"]`. Installing it also adds ban and impersonation columns, so it belongs to the users feature. This feature does not read `user.role`. A global write grant is what sees everything.

### Services

Plain functions. Zod schemas live next to them and allowlist client fields. `id`, timestamps, actor, `voided`, both tares, net weight, the copied `grower_id`, and `revision` are server-controlled.

`lib/services/reference-data.ts`: list active (and, for the admin screen, list all), create, update, deactivate. The set-form grower list is the scoped one above. Updating a tare runs the voided-pallet statement in the same transaction as the type’s update.

`lib/services/pallet-sets.ts`:

- `listPalletSets` — active only, filters, limit/offset, stable order `received_on DESC, reference_number DESC, id DESC`. Page size default 50, maximum 100.
- `listVoidedPalletSets` — the same shape, voided only.
- `getPalletSet` — by UUID. At most two queries: the set with its grower, and the pallets with type names.
- `getActivePalletSetByReferenceNumber` — the active row only, including a set that has no pallets.
- `createPalletSet` — header, and an optional pallet list that may be empty. One transaction. Included pallets are inserted in that same transaction.
- `updatePalletSet` — header fields only (kind, reference number, grower, date). It does not read or write the pallet list.
- `addPallets`, `updatePallets`, and `removePallets` — one shared function applies any combination of those three lists in a single transaction. The API routes each fill one list. The grid’s save action fills the lists for the rows the operator added, edited, or removed, and makes one call. Loads current tares, computes net weight, copies `grower_id` and `voided` from the set, and writes one audit event. A remove of the last pallet leaves the set active. Adding or removing on a voided set returns `SET_VOIDED` and writes nothing.
- `voidPalletSet` — one transaction, revision check, audit event.

Each of these sends the revision it loaded. A mismatch returns `SET_REVISION_CONFLICT` and writes nothing. The response includes the new revision, so the next add can chain from it. Two people changing the same set do not silently overwrite each other. Unique violation `23505` maps to the same conflict result as the pre-check. Constraint names are fixed: `pallet_sets_active_reference_number_uidx`, `pallets_active_grower_pallet_number_uidx`.

Conflict results, shared by the action and the future API:

- `REFERENCE_NUMBER_TAKEN` with `referenceNumber`
- `PALLET_NUMBER_TAKEN` with `palletNumbers` (every number in the payload that collides) and `growerId`

Validation results use a 400-class code, not 409: `NET_WEIGHT_NEGATIVE`, `PALLET_NUMBER_DUPLICATE`, `SET_TOO_LARGE`, `SET_VOIDED`, `INACTIVE_REFERENCE`, plus Zod field errors. The Hebrew message is on the result. The code is English and stable. An empty pallet list is not one of these errors.

A missing set and a set the actor may not see both return `NOT_FOUND` with the same generic Hebrew message. A read-only actor who tries to write gets `READ_ONLY`.

### Screens

Hebrew, RTL, brand tokens, both themes. Integers, dates, and UUIDs in the few places a UUID is shown as text sit in `<bdi dir="ltr">` with `tabular-nums` for columns of numbers. The list does not show UUIDs and its search does not accept them.

After sign-in, `/app` is a launcher, not a list of links. Tiles sit in a wrapping row that starts on the inline start (the right side in Hebrew). Each tile is a landscape rounded rectangle, wider than it is tall: `rounded-lg`, `bg-surface`, a 1px `border`, no shadow. Inside it, a Lucide icon sits above a Hebrew label. One shared link component, `components/ui/launcher-tile.tsx`, is used on the home screen and on the tables screen. The icon uses `text-primary`, the label `text-foreground`. Strokes stay the Lucide default weight. The tile is a real link, at least 44px, with a visible `focus-visible` ring. A tile the actor cannot open is omitted, not shown disabled.

Home tiles in this feature:

| Label | Icon | Opens |
| --- | --- | --- |
| טבלאות | `Table2` | `/app/tables` |
| מיון ראשוני | `Boxes` | `/app/pallet-sets` |

מיון ראשוני is the pallet-set list, under that Hebrew name. Kinds B and C stay inside it, behind the kind filter. The route and the code stay `pallet-sets`. Later screens get their own home tile, or they are reached from one of these tiles or from a child of those screens. Detail, edit, new, and the voided list are children of מיון ראשוני. They do not get home tiles.

`/app/tables` uses the same tiles:

| Label | Icon | Opens |
| --- | --- | --- |
| מגדלים | `Users` | `/app/growers` |
| סוגי יבול | `Leaf` | `/app/yield-types` |
| סוגי אריזה | `Package` | `/app/package-types` |
| סוגי משטח | `SquareStack` | `/app/pallet-types` |

Each of those four screens can create, rename, and deactivate. Package types show the tare (kilograms in, grams stored) and the inventory checkbox. Pallet types show the tare. A back link returns to טבלאות, and from there to the launcher.

The other pallet-set screens, all titled under מיון ראשוני and reached from that list:

- `/app/pallet-sets` — active sets. Filters in the query string: kind, grower, date from, date to, exact reference number, page. The date column shows day and month. The year is in the filter and on the detail page.
- `/app/pallet-sets/voided` — voided sets only. A link from the active list, not a home tile.
- `/app/pallet-sets/[id]` — detail, including an active set with no pallets and a voided set opened by id. Empty state in Hebrew, an add-pallet form, and a remove control on each pallet. Those call `addPallets` and `removePallets`. Void action with a confirmation. Add and remove are absent on a voided set. Static segments `new` and `voided` must stay ahead of `[id]`.
- `/app/pallet-sets/new` — header fields. The operator can save with no pallet rows and land on the new set’s detail. The same page can include the grid below.
- `/app/pallet-sets/[id]/edit` — header fields, then the pallet grid. A new row copies yield type, package type, pallet type, and package amount from the previous row. Pallet number and gross weight start empty, so a copied number does not collide. The operator can remove every row and save; the set stays active and empty. Keyboard: fields are real inputs, Enter moves along the row, and a control adds a row. Net weight updates as the row is edited. Submit uses `useActionState` and sends one `add` / `update` / `remove` call for the rows that changed, plus the header update when the header changed. Expected failures return a result and a Hebrew message (`aria-invalid`, `aria-describedby`). The form sends the revision it loaded.

The public page `/` stays as it is. Sign-in still lands on `/app`.

After a tare edit, voided detail pages show the recalculated kilograms. Active detail pages stay on the last save until someone saves them again.

### API parity, after the authentication decision

Not built by tasks 1–6. The same services and the same result codes. Route Handlers return `NextResponse.json` with the status. `params` is awaited.

| Method and path | Success | Conflict / denial |
| --- | --- | --- |
| `GET /api/v1/pallet-sets` | 200, one page | |
| `POST /api/v1/pallet-sets` | 201, the UUID. The pallet list may be omitted or empty | 409, 400 |
| `GET /api/v1/pallet-sets/:id` | 200, pallets included (possibly none) | 404 |
| `PATCH /api/v1/pallet-sets/:id` | 200, header only | 409 `SET_REVISION_CONFLICT` or a number conflict, 400 |
| `POST /api/v1/pallet-sets/:id/pallets` | 201, the new pallet UUIDs. Body is one pallet or a list | 409, 400 `SET_VOIDED` |
| `PATCH /api/v1/pallet-sets/:id/pallets/:palletId` | 200 | 409, 400, 404 |
| `DELETE /api/v1/pallet-sets/:id/pallets/:palletId` | 200. The set may then have no pallets | 409 revision, 400 `SET_VOIDED`, 404 |
| `POST /api/v1/pallet-sets/:id/pallets/remove` | 200. Body is a list of pallet UUIDs. Same service as `DELETE` | 409, 400, 404 |
| `POST /api/v1/pallet-sets/:id/void` | 200 | 409 revision, 404 |
| `GET /api/v1/pallet-sets/voided` | 200 | |
| `GET /api/v1/pallet-sets/by-reference/:referenceNumber` | 200, the active set | 404 when none is active |
| Reference lists and writes | 200 / 201 | 400, and 403 when the grant is missing |

Create, header `PATCH`, and pallet `POST` / `PATCH` bodies use the same Zod allowlist. `grossWeightGrams` is an integer. `netWeightGrams` and tare fields are rejected if present. Header `PATCH` has no pallet field.

### Authentication decision (required before any `/api/v1` route)

The sorting application needs a credential of its own. Three options:

1. **Session cookie only.** The other app signs in as a user and stores the cookie. That reuses `getSession` and adds no schema. A cookie session is a poor machine credential: it is tied to one human’s login, it is awkward to rotate, and a browser-oriented cookie is the wrong secret to put on a server. Rejected for the sorting application. It remains the UI path.
2. **A bearer token we invent.** The project rule is to use Better Auth for sessions and tokens. Rejected.
3. **Better Auth’s API-key plugin. Recommended.** A key is created for a user, stored hashed, and sent on each request. The route calls `verifyApiKey`, builds the same `Actor` from that user, and calls the same service. One indexed lookup per request, which is the same order of cost as a session lookup. Per-key rate limits come from the plugin. Keys are HTTPS-only in production, shown once at creation, and revocable. The plugin’s permissions object is not the grower/kind model; `lib/access.ts` stays the authority. The plugin adds its own table through the Better Auth CLI, then a Drizzle migration. No hand-written auth table.

A key still needs an owner so the request can load grants and the audit trail can name an actor. The sorting application should not use a person’s login. It needs its own user with no email and no password. That account type is not part of this feature: Better Auth’s current `user` row requires an email, and no API route is built here. It is todo 9, to be decided with the API-key approval. Until that exists, the only user who could own a key is the local bootstrap user. Do not install the plugin, and do not add the routes, until this recommendation is explicitly approved. Approving the plan is not that approval.

### Users-feature checklist

This feature’s service tests cover the items below for the surfaces that exist now: list, detail, reference-number lookup, nested pallets, create, header edit, add, remove, void, grower dropdown, and reference admin. Reports, exports, and `/api/v1` do not exist yet. When they do, they call the same `scopeForSets`. The users feature adds the screen that writes `access_grants` and repeats these tests as a signed-in limited user. It does not invent a second check.

- A scoped user cannot see out-of-scope sets through the list, the detail URL, reference-number lookup, counts, aggregates, reports, exports, nested pallets, or the API.
- Grower dropdowns list only in-scope growers. Yield, package, and pallet types stay global.
- A write cannot create or edit a set outside the user’s scope, including by adding or removing pallets, or by changing grower or kind so the set leaves the scope.
- A read-only user cannot create, edit, void, add pallets, remove pallets, or change reference data by Server Action or by the API.
- A reference-table grant cannot edit a different table or any set.
- `NOT_FOUND` is the same for a missing id and an out-of-scope id. Bodies and Hebrew text do not reveal that the other row exists.
- Admin bypasses grants. Admin is Better Auth’s `admin` role from the admin plugin, not a value the client sends.
- An actor with no grants sees nothing.

## Test plan

Vitest is a new dev dependency, approved with this plan. Pin the version that is installed. No Playwright, React Testing Library, or `drizzle-zod`. Tests refuse a non-local database host, the same way the seed does.

Service tests, against local Postgres, cleaned up in `finally`:

- Net weight: a normal positive result, an exact zero that is stored, a negative active save that returns `NET_WEIGHT_NEGATIVE` and writes nothing. The shared function and a direct SQL read agree, so the preview and the server match.
- The voided tare update: one statement, active rows unchanged, a voided row whose formula stays non-negative stores that result, a voided row whose formula goes negative stores 0 and the new tare.
- Duplicate reference number and duplicate pallet number, including the same pallet number on kinds A and B for one grower, and the same number for two growers (allowed). The 409 result lists every colliding pallet number.
- Two concurrent saves of the same active number: one commits, the other receives the mapped unique-violation error.
- After void, the same reference number and pallet number can be saved on a new set. The old UUID still resolves. Lookup by the integer returns only the active set.
- Voided sets are absent from the active list and present on the voided list.
- Deactivated reference rows cannot be used on a new pallet. Existing pallets still resolve their names.
- Creating a set with no pallets succeeds. The set is on the active list and holds its reference number. Adding a pallet, then removing it, leaves that set active and empty, drops the live pallet row, and keeps the pallet UUID in the audit subjects. Adding a pallet to a voided set returns `SET_VOIDED`.
- A header update does not change the pallet count.
- Revision mismatch writes nothing.
- Access, with actors built in the test (grant rows mapped through the same loader `getActor` uses):
  - No grants: list is empty, detail and reference-number lookup are `NOT_FOUND`, writes fail.
  - One grower, all kinds, write: sees that grower’s A, B, and C sets, including empty ones; a set for another grower is `NOT_FOUND` on detail, lookup, and add. The grower dropdown lists only that grower.
  - Kind B only, read: sees every grower’s B sets and cannot add, remove, void, or edit. An A set is `NOT_FOUND`.
  - Grower X and kind A, write, plus grower Y and kind C, read: the union. X/A can be edited. Y/C can be read. Y/A is `NOT_FOUND`. Changing the X/A set’s grower to someone outside the write grants is denied and the row is unchanged.
  - Global read: sees every set, `READ_ONLY` on write.
  - A package-type grant: can update that tare, cannot update growers, cannot create a set, cannot add a pallet.
  - Global write: can do all of the above.

UI checks, in the browser, light and dark, with a real Hebrew string longer than the label: create a grower and a package type, save a set with no pallets, add one pallet from the detail page, remove it, enter several rows from the keyboard, confirm the preview matches the stored kilograms, reload the detail, edit, void, and find the set only on the voided list.

## Risks

- The composite foreign key is the piece the migration reviewer must read closely. A missing `ON UPDATE CASCADE`, or a partial index without `WHERE voided = false`, silently breaks either grower edits or number reuse.
- The net-weight check makes a naive un-void fail when a clamped voided pallet no longer matches the active formula. That is intended, and it is on the todo.
- Last-write-wins is avoided for set saves by `revision`. Reference-data edits do not have a revision. Two admins can overwrite a tare; the last transaction’s voided update wins, and the audit event records the value that was written.
- Audit summaries for a 500-pallet save are larger, but they are one insert on the save path. List and detail must not join `audit_events`.
- Tare clamping does not write per-pallet audit rows. Someone reading only a pallet’s history will not see a line that says “tare clamped this net to 0.” The type’s history has the tare change.
- There is still no screen to attach a limited grant. After the seed runs, the local user is a global writer. A second person stays locked out until the users feature inserts grant rows. Public sign-up stays off. The limited-grant behavior is real in the services and is covered by tests, not by the browser session.
- Tests that commit a row must delete it and must refuse a non-local host. A concurrency test uses two connections.
- `getSession` on these pages keeps them dynamic. Do not move it to the root layout.

## Tasks

One chat each, in order. Each leaves the app working: `npm run typecheck`, `npm run lint`, and `npm run build` pass. Do not apply a migration until `migration-reviewer` has reviewed the generated SQL. After Server Actions, services, and queries, run `security-reviewer`. Before calling a task done, run `verifier`. Local database only.

Task 3 writes the audit rows because they have to commit in the same transaction as the save. Adding them later means reopening every service. Task 6 is the history screen, not the first time a row is written. The audit tables themselves are created in task 2.

| Task | Brief | Status |
| --- | --- | --- |
| 1. Reference data and admin | `docs/project/tasks/08-reference-data.md` | done |
| 2. Pallet-set schema and migration | `docs/project/tasks/09-pallet-set-schema.md` | not started |
| 3. Services, access checks, and tests | `docs/project/tasks/10-pallet-set-services.md` | not started |
| 4. List, detail, void, voided view | `docs/project/tasks/11-pallet-set-list.md` | not started |
| 5. Entry and edit screen | `docs/project/tasks/12-pallet-set-entry.md` | not started |
| 6. History screen | `docs/project/tasks/13-pallet-set-history.md` | not started |
| API routes | none | blocked on the authentication decision |

### 1. Reference data and admin

Goal: growers, yield types, package types, and pallet types can be maintained in Hebrew by a signed-in user, behind the access hook.

Files: `db/schema/reference-data.ts`, `db/schema/access-grants.ts`, `db/schema/index.ts`, a new migration, `lib/access.ts`, `lib/services/reference-data.ts`, `components/ui/launcher-tile.tsx`, `features/reference-data/`, the `/app` launcher, `/app/tables`, the four table screens, and the seed’s global write grant. Vitest is installed here and covers reference grants, empty grants, and the seed grant. Pallet-set grower and kind cases are task 3, because those tables do not exist yet. The מיון ראשוני tile is added in task 4.

Depends on: nothing in this plan.

Acceptance:

- Migration reviewed, then applied locally. New tables only. `nahala_app` can insert and still cannot `CREATE`.
- Admin screens create, rename, change a tare, toggle the inventory flag, and deactivate. Inactive rows disappear from the active list and remain in the admin list.
- A second run of the service tests passes. `typecheck`, `lint`, and `build` pass.
- Browser: both themes. Sign-in lands on the launcher, whose only tile is טבלאות. That page shows the four table tiles. A long Hebrew name, tare entered as kilograms and stored as grams. Keyboard can reach each tile.

### 2. Pallet-set schema and migration

Goal: sets, pallets, and the audit tables exist, with the constraints and indexes in this plan, and no UI yet.

Files: `db/schema/pallet-sets.ts`, `db/schema/audit.ts`, `db/schema/index.ts`, a new migration.

Depends on: 1.

Acceptance:

- `migration-reviewer` has read the SQL before `db:migrate`. The SQL shows both partial unique indexes, the composite foreign key with `ON UPDATE CASCADE` and `ON DELETE RESTRICT`, the net-weight check (zero allowed, negative active value impossible, voided value equals `GREATEST(0, formula)`), and the list indexes.
- Nothing destructive. Auth tables untouched.
- The app still signs in and the reference screens still work.

### 3. Services, access checks, and tests

Goal: the set and reference services enforce the rules in this plan, including audit writes and the voided tare update.

Files: `lib/services/pallet-sets.ts`, `lib/pallet-sets/net-weight.ts`, `lib/pallet-sets/kinds.ts`, `lib/access.ts`, the reference service, and the Vitest files.

Depends on: 2.

Acceptance:

- The test plan’s service cases pass against local Postgres, including the concurrency case and the grower and kind cases. List, detail, reference-number lookup, add, remove, and the grower dropdown all use `scopeForSets`.
- Creating a set, changing its header, adding pallets, and removing pallets are each one transaction. A thrown error after an insert leaves no partial pallet and no audit event. An empty create is covered by the service tests.
- `security-reviewer` has reviewed the services. `verifier` has run typecheck, lint, and tests, and the results are the real output.

### 4. List, detail, void, and the voided view

Goal: a signed-in user can find an active set, open it (including one with no pallets), add or remove a pallet, void it, and find it afterward only on the voided list.

Files: `app/app/pallet-sets/`, `features/pallet-sets/` for the list and detail, and a single-pallet add form. The multi-row keyboard grid is task 5.

Depends on: 3.

Acceptance:

- Filters and page live in the query string. The active list never shows a voided set. An empty active set does show. Detail loads in at most two queries and does not query the audit tables.
- From the detail page, add one pallet and remove it. The set stays on the active list with its reference number. The voided detail has no add or remove control.
- Void asks for confirmation, then the set is gone from the active list and present on the voided list. Its reference number can be entered on a new set once task 5 exists; until then a service test already covers reuse.
- The launcher shows מיון ראשוני next to טבלאות. Opening it shows the active list under that title. Voided sets, detail, and new are reached from there.
- Browser check in both themes. Numbers are LTR.

### 5. Entry and edit screen

Goal: create and edit a set of many pallets from the keyboard, with a live net weight that matches the server.

Files: the new and edit pages, the grid client component, the shared net-weight and kilogram formatter modules.

Depends on: 4.

Acceptance:

- Saving the new-set form with no rows creates an empty active set.
- A grid of about 40 rows submits once, through the add, update, and remove lists. Removing every row and saving leaves the set active and empty. Adding a new row keeps the set UUID and mints a new pallet UUID.
- Preview of zero can be saved. Preview below zero cannot. After save, the detail kilograms equal the preview for unchanged tares.
- Changing a package tare afterward changes a voided set’s stored net and leaves this active set’s stored net until that pallet is saved again.
- Hebrew errors for a taken reference number, a taken pallet number, and a stale revision. Browser check in both themes, including keyboard-only entry of two rows.

### 6. History screen

Goal: from a set, a pallet, and a reference-data row, a signed-in user can read the audit trail that task 3 already writes.

Files: a history panel on the set detail and on the reference admin screens, and a read function that queries `audit_subjects` by id. No new write path and no migration unless a missing index is found.

Depends on: 5.

Acceptance:

- Opening a set does not query the audit tables until the history panel is opened. The panel query is indexed and limited.
- An edit that removes a pallet still shows that pallet’s UUID and its last values on the set history.
- A tare change shows one event on the package type or pallet type, not one event per pallet.
- Browser check in both themes.

## Postponed items

Already written, in the same order, to `docs/project/todo.md` and `docs/project/architect-todo.md`. Do not copy them again when this plan is approved.
