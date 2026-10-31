# 12 — Entry and edit screen

Status: not started. Pallet-intake task 5. Depends on 11. Do not start 13.

## Goal

Create and edit a set of many pallets from the keyboard. The live net weight matches an active save.

## Read first

- `docs/project/STATE.md`
- `docs/project/plans/pallet-intake.md` (Weights, Services, Screens for new and edit)
- `lib/pallet-sets/net-weight.ts`, the kilogram formatter from task 08, `lib/services/pallet-sets.ts`, the list and detail pages from task 11
- `.cursor/rules/brand-design.mdc`

The net-weight module and the kilogram formatter must stay free of `server-only` and `db`. The client grid imports them. Look up `useActionState` from `react` before writing the form.

## Acceptance

- Saving the new-set form with no rows creates an empty active set and opens its detail.
- A grid of about 40 rows submits once, through one add/update/remove call for the rows that changed, plus a header update when the header changed. Removing every row and saving leaves the set active and empty. Adding a row keeps the set UUID and mints a new pallet UUID. Editing a row keeps that pallet UUID.
- A new row copies yield type, package type, pallet type, and package amount from the previous row. Pallet number and gross weight start empty.
- Preview of zero can be saved. Preview below zero cannot, and the server agrees. After save, the detail kilograms equal the preview when tares did not change underneath. The preview does not clamp. Clamping is only the voided tare update.
- Changing a package tare afterward changes a voided set’s stored net and leaves this active set’s stored net until that pallet is saved again.
- Hebrew errors for a taken reference number, a taken pallet number, and a stale revision (`aria-invalid`, `aria-describedby`).
- Browser, light and dark, including keyboard-only entry of two rows. `security-reviewer` has reviewed the action. `verifier` has run typecheck, lint, tests, and build. Quote the results.

## Scope

`/app/pallet-sets/new` and `/app/pallet-sets/[id]/edit`. The grid is a client component. Fields are real inputs. Enter moves along the row. A control adds a row. Submit uses `useActionState` and sends the revision the page loaded.

The action calls the existing services. It does not reimplement net weight or uniqueness. The server reloads tares at save time and ignores any net or tare field in the payload.

## Constraints

- Hebrew, RTL, logical utilities, tokens, both themes. Numbers in `<bdi dir="ltr">`.
- More than 500 pallets in one request is `SET_TOO_LARGE`. There is no special path for 40.
- Do not add a home tile for edit, new, or voided.
- Do not build the history panel or `/api/v1`.

## Security and performance

- One transaction for the pallet changes of a single submit, via the shared service. Do not call add, update, and remove as three separate requests from the browser for one save.
- The preview uses the tares loaded with the form. The saved net uses the tares read at save time. If those differ, the stored value wins and the next load shows it.

## Do not touch

Schema, grant rules, audit write shape, the reference-data admin except where the tare-edit check above needs a voided set to exist.

## Report when done

Files changed, how the preview and the stored grams were compared, and the real browser, typecheck, lint, test, and build results. Do not start 13.
