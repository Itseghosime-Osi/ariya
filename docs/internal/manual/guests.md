# Guests

Add, import, search and organise the guest list.

Audience: Hosts and planners

> Archived from the former public manual. Internal reference only; content reflects the product at the time it was archived.

## The registry

`/events/[id]/guests` is a table of guest parties with name, party size, side, group, RSVP status, table and a personal-link tool. Open a guest to edit details, copy their link, or see what they answered. Status is always a word as well as a colour: confirmed, pending or declined.

## Ways to add guests

| Method        | How                           | Notes                                                                                                          |
| ------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Type them in  | Add guest                     | Name, optional phone and email, party size, side, group, notes                                                 |
| Spreadsheet   | Import → upload a CSV         | Rows are checked before anything is saved; missing details and duplicates are flagged. Up to 500 rows per file |
| Phonebook     | Import → Pick from contacts   | Uses the browser's contact picker where available (Chrome on Android). Otherwise use the file option           |
| Contacts file | Import → upload a `.vcf`      | Works on any device: export contacts from your phone and upload                                                |
| AI app        | `add_guest` / `import_guests` | Up to 200 rows per import. See [Connect your AI](connect-ai.md)                                                |

Phone numbers are normalised to the Nigerian international format where possible (see `lib/phone`).

> Free limit: A free celebration can invite up to 20 guests. Beyond that the database refuses with `PAYMENT_REQUIRED` until the [Celebration Pass](billing.md) is paid.

## RSVP questions

Under Invitations you can add your own questions (for example food choice or aso ebi size). Guests answer them when they accept, and the answers appear on the guest's row. They are stored in `rsvp_answers`.

## Search

Use the search box on the registry, or press `⌘K` (Ctrl K) anywhere for global search across celebrations, guests and vendors you are allowed to see.
