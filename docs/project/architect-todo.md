# Architect todo

Notes for you. Agents use the short list in `docs/project/todo.md` and open a section here only when they are already working on that item.

Foundation leftovers (proxies, backups, the first production user, and the rest) stay in `docs/project/STATE.md` under Deferred. They are not repeated here.

## 1. What voiding entails

The pallet-intake plan builds a void action and a separate voided list. Voiding an active set frees its reference number and its pallet numbers. Un-voiding is not built.

Still open: who is allowed to void, whether un-voiding should exist, what happens if the reference number or a pallet number was reused while the set was voided, and how a void changes future package balances. Kinds A and B move packages from the grower to the packing house. Kind C does not. A package type can also be marked as not counting toward the grower. None of those balances are calculated in this feature. Editing an active set's grower or kind also changes which future balance that set would belong to.

Un-voiding has a weight trap. A later tare edit recalculates voided pallets and stores net weight 0 when the formula would be negative. Active pallets must store a net weight equal to the formula, and that value may be zero but not negative. Flipping a clamped voided pallet back to active fails that check. An un-void has to recalculate net weight and decide what to do when the formula is still negative. Do not add an un-void action until this is decided.

## 2. Season system

There is no season. Nothing resets. An active reference number or pallet number from last season keeps blocking a new one. Candidates for what a season switch would keep or clear: reference numbers, pallet numbers, reference data (growers and types), and sets that are still open. This has to be decided before the first real rollover. Do not design the switch in pallet intake.

## 3. Linking C sets to A pallets

A C set (transfer to final sorting) might later point at the A pallets that were fed into it, so statistics can follow the fruit. It might also have no such link. Do not add a foreign key or a screen for it.

## 4. Certificate for empty packages

A future document hands empty packages from the packing house back to the grower. The kind-to-flow constant already has room for a third direction, `out`. A and B are `in`. C is `none`. The package-type checkbox is a second gate: even an `in` set counts a package only when that type is marked for grower inventory. Do not build the certificate.

## 5. More scope types

Pallet intake already enforces global read, global write, pallet-set grants limited by grower and kind, and a write grant for each of growers, yield types, package types, and pallet types. A null grower or kind on a grant means "all" for that field. The set itself always has both. There is no screen to assign grants. The local bootstrap user receives one global write grant from the seed.

Later features add their own filters on that same grant model. Package limits are item 10, not part of this item.

## 6. Agroline Excel export

The sorting application will replace the Excel export you use for Agroline. It will call the Nahala API. Those routes are not in pallet intake. They wait on the API-key decision. Growers and types are addressed by Nahala's id. Agroline's own codes are not stored here. The sorting application keeps the mapping.

## 7. Users and assigning grants

Not in pallet intake. Later, a screen creates users and writes `access_grants`, then the security checklist in the pallet-intake plan is repeated while signed in as a limited user. Reports, exports, and the API must call the same scope function. They must not grow a second check.

Admin, when that feature adds Better Auth's admin plugin, is the `admin` role on the user. The client cannot set that field. The plugin also adds ban and impersonation columns, which is why it stays out of pallet intake. This feature does not read the role. A global write grant is what sees everything.

## 8. Richer pallet numbers

Reference numbers and pallet numbers are positive integers for now. `"01"` is not a different value from `1`. A pallet number is unique per grower across active sets of every kind. A reference number is unique among active sets, with no grower boundary. Reference numbers stay integers. Only pallet numbers are waiting on a more complicated scheme, which you still need to think through. Until a season exists (item 2), last season's active integers keep blocking new ones.

## 9. Machine user for the sorting application

An API key belongs to a user. The request then loads that user's grants, and the audit trail names that user. The sorting application should not use a person's login.

You want that owner to have no email, no password, and no way to open the screens. It only owns a key and holds grants. Better Auth's current user row requires an email, so this does not fit the account model as it stands. Decide the representation when API keys are approved: a non-login email, or a principal that is not a password user. Do not build it in pallet intake. Until it exists, the only user who could own a key is the local bootstrap user. Approving the pallet-intake plan does not approve API keys.

## 10. Access limited to specific packages

Decide whether a user may be limited to certain package types, and whether those types should sit in groups. Pallet-intake grants do not filter by package. Anyone who can read a set sees every package type. Do not add package groups, and do not hide package types by user, until you decide this.
