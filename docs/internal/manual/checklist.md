# Checklist and day-of

A dated plan, weekly digest, calendar export and an offline run sheet.

Audience: Hosts and planners

> Archived from the former public manual. Internal reference only; content reflects the product at the time it was archived.

## The checklist

`/events/[id]/checklist` is generated from your plan and seeds itself the first time you visit, so it is never empty. Tasks are reconciled by a stable `source_key`; a task you delete stays deleted (a tombstone), and re-generating never duplicates.

- Phases and a 'next best action' keep progress calm rather than nagging.
- Risk advice can be added to the checklist; asking twice is a no-op.
- Collaboration follows team roles; changes are undoable.

## Reminders and calendar

- **Weekly digest** email from `/api/cron/digest` (a GitHub Actions workflow). One send per person per week (`digest_log`); quiet hours hold a send rather than drop it.
- **Calendar export**: `/api/events/[id]/checklist.ics`, scoped by the caller's permissions.
- **Reminders page** (`/events/[id]/reminders`) and a daily reminders cron on Vercel at 09:00.

## Day-of mode

`/events/[id]/day-of` is a separate, offline-first run sheet. A service worker (`public/sw.js`) caches it so it still opens in a hall with no signal.
