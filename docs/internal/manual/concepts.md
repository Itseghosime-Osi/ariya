# Concepts and glossary

The few ideas and words that the rest of the manual relies on.

Audience: Everyone

> Archived from the former public manual. Internal reference only; content reflects the product at the time it was archived.

## Core ideas

- **Celebration (event)**: the container for everything else. Guests, tables, vendors, tasks and the invitation all belong to one.
- **Guest party**: one row on the guest list. It may be a single person or a household with a party size, so the headcount is always people, not names.
- **Personal link**: `/i/<token>`. Unique to each guest; it shows their invitation and RSVP form. Anyone holding it can reply as that guest, so share it only with them.
- **Entry code**: the guest's own `check_in_code`, drawn into the card as the entry seal and typed or scanned at the door.
- **Design document**: the saved JSON of an invitation (layers, canvas, palette). One renderer draws it everywhere.
- **Proposal**: something an AI app asks to do (send invitations, apply a layout). It waits for the host on the approvals desk. Nothing happens until the host approves.

## Glossary

| Term             | Meaning                                                                                   |
| ---------------- | ----------------------------------------------------------------------------------------- |
| Owambe           | A large, lively Nigerian celebration                                                      |
| Aso ebi          | Matching cloth worn by a family or group; the woven-stripe motif in the design nods to it |
| Gele             | Head tie; shown as a vendor category in examples                                          |
| Celebration Pass | The ₦50,000 one-off payment that unlocks a large event                                    |
| Entry seal       | The crest on the card whose pattern encodes the guest's entry code                        |
| Admit            | The explicit button at the desk. Verifying a pass never lets anyone in by itself          |
| RLS              | Row Level Security, the database rule layer that decides which rows each person may see   |
| MCP              | Model Context Protocol, how AI apps connect to Àríyá at `/mcp`                            |
| Design engine    | The Rust/WebAssembly code that edits invitation designs                                   |
| Studio engine    | The Rust/WebAssembly code that does hall layout, thermal, catering and risk               |
| Kobo             | One hundredth of a naira. ₦50,000 is stored as 5,000,000 kobo                             |

## Voice and language

The product is warm, short and Nigerian-aware ('Every yes, together', 'Owambe mode'). Money is shown in naira with the ₦ sign and times are in Lagos time. See [Design system](design-system.md).
