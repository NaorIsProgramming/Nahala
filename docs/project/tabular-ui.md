# Tabular editing

The pallet grid is the model for dense entry screens. A set of many similar rows is edited in place, from the keyboard, and saved once. It is not a stack of forms and it is not a spreadsheet that writes on every keystroke.

## One row is one record

Each pallet is one row. The operator sees the values as text. A box appears around a cell only while that cell is focused, so a full set does not turn into a wall of inputs. The set header (kind, reference number, grower, date) stays in ordinary fields, because those are few and they describe the whole set.

A light line separates every row from the next and every column from the next. The row the operator is in is a slightly darker beige than the table, so the current pallet is obvious without a checkbox.

## Focus and selection are different

Focus is the cell that receives typing. It also marks its row.

Selection is a range of rows, used only for actions. It is drawn the same darker beige. There are no checkboxes. The row number on the right is the handle: press it and drag down, or hold Shift and press Arrow up or Arrow down. Escape drops a selection of more than one row. If a suggestion list is open, the first Escape closes the list and the next one drops the selection.

Actions follow the selection, and they do not all stay on screen together:

- One pallet: **העתקת משטח**, with a count of how many copies. The first copy’s pallet number is the source plus one, the second is the source plus two, and so on. Copies are inserted under the source. The pallet number is the only field that changes; the rest is the same pallet.
- Several pallets: the copy control is hidden. **הסרת המשטחים** asks before those rows leave the table.

Removing one row from its row number does not ask. Removing several always does.

## Keys

The keyboard walks the grid. The mouse is for choosing a name and for dragging a selection.

| Key | What it does |
| --- | --- |
| Tab | Moves to the next control, including the row numbers and the buttons. |
| Enter | On an open name list, chooses the highlighted name and stays in the cell. Enter again, or Enter on a number, amount, or weight, moves along the row. |
| Arrow up / Arrow down | Moves to the same column in the pallet above or below. Shift extends the selection. |
| Arrow up / Arrow down while a name list is open | Moves inside that list, not to another pallet. |
| Control + Arrow up / Arrow down | Leaves the cell for the pallet above or below, even while a list is open. |
| Control + Arrow left / Arrow right | Moves to the neighbouring column. Left and right follow the screen, not the reading order. |
| Escape | Closes an open name list. If several pallets are selected and no list is open, drops that selection. |

Typing a name that is not yet chosen keeps the arrows inside the list. A chosen name does not.

## What the screen does not do

The grid does not save by itself. One שמירה sends the header, if it changed, and the rows that changed. Net weight on the row is a preview from the tares loaded with the form. The client does not send net weight or tare.

The table stays a comfortable width. It does not stretch to fill a large monitor, and it does not wrap every value in a box.
