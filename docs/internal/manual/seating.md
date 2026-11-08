# Seating

A full-screen 3D hall: place tables, seat the confirmed, print the plan.

Audience: Hosts and planners

> Archived from the former public manual. Internal reference only; content reflects the product at the time it was archived.

`/events/[id]/seating` is a full-screen workspace (the normal app chrome hides). A 3D hall sits beside a set of panels: a tool rail, a layers panel, a table dock and an inspector.

## Rules that always hold

- Only guests who said **yes** can take a seat; pending guests wait.
- A table never takes more people than it has chairs, counting **party size**. Full tables show as full before you assign anyone.
- Seating is blocked on archived celebrations.

## Workspace tools

- Add tables (round, rectangular and more) and drag them in the hall; positions are stored in centimetres.
- Layers panel: show or hide, lock and reorder items; a dark theme for the studio.
- Duplicate with `⌘/Ctrl D` or Ctrl-click, place rows of tables or chairs, group items so a click selects the whole group and moving it is one undo step.
- Auto-seat fills unseated confirmed guests by group and side without moving anyone already seated.
- Table list view for people who prefer rows to a picture.
- **Print** at `/events/[id]/seating/print` gives a clean seating chart.

## Two modes, one document

**Simple** asks six questions and writes a layout. **Studio** lets you edit every detail. Both write the same document, `events.hall_layout` (JSON, at most 64 KB), so you can switch freely.

The 3D view is `public/hall3d/hall3d.js` running in an iframe, handed the same JSON; it is deliberately kept out of the app bundle. See [Venue studio](venue-studio.md).
