# Todo

Short list for agents. The owner's longer notes are in `docs/project/architect-todo.md`. Read that file only for the one item you are already handling. Do not treat it as extra requirements.

1. Voiding policy is undecided: who may void, whether un-void exists, number conflicts, and package balances. Do not build un-void. A tare clamp can make a naive un-void fail.
2. No season boundary yet. Active numbers keep blocking across seasons. Do not design a season switch.
3. C sets might later link to the A pallets that fed them. Do not add that link.
4. A future certificate will hand empty packages to growers (`out`). Do not build it. Leave `PACKAGE_FLOW` open.
5. New features add their own grant filters. Grower, kind, global, and the four reference-table grants already exist in the pallet-intake plan.
6. Replace the Agroline Excel export by the sorting application calling the Nahala API.
7. Users screen and assigning grants are not in pallet intake. Later screens must call `scopeForSets`.
8. Pallet numbers are positive integers for now. A richer scheme is undecided. Reference numbers stay integers.
9. The sorting application needs a user with no email and no password to own an API key. Not in pallet intake. Decide when API keys are approved.
10. Decide later whether grants can limit package types, possibly via groups. Do not filter by package, and do not add groups.
