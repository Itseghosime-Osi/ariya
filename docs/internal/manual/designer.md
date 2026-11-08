# Invitation designer

A full-screen design tool with Simple and Pro modes, shapes, pictures and your own card.

Audience: Hosts and planners

> Archived from the former public manual. Internal reference only; content reflects the product at the time it was archived.

Open it from Invitations → **Open the designer** (`/events/[id]/invitations/design`). It is a full-screen workspace, like the seating studio, so the normal app chrome is hidden.

## Two modes

| Mode   | For       | What you get                                                                                   |
| ------ | --------- | ---------------------------------------------------------------------------------------------- |
| Simple | Anyone    | A guided panel: choose a look, edit the words, change colours, add a picture, import your card |
| Pro    | Designers | A free canvas with a tool rail, layers dock, inspector and on-canvas handles                   |

## Layer kinds

| Kind                                               | What it is                                                                                                   |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Text (headline, subheadline, kicker, footer, body) | Words with font, size, weight, italic, tracking, alignment and colour role. Kicker and footer are upper-case |
| Divider                                            | A hairline with a small star                                                                                 |
| Shape                                              | Rectangle, ellipse or line, with fill, stroke, stroke width and corner radius                                |
| Image                                              | A picture, fitted cover or contain, with rounded corners                                                     |
| Seal                                               | The couple's wax monogram seal                                                                               |
| Entry seal (code)                                  | A crest whose pattern encodes the guest's entry code. See below                                              |

## Pro tools

- Drag to move, drag the handles to resize and rotate (rotation snaps to common angles).
- Layer panel: show or hide, lock, reorder, rename. Stacking: forward, backward, to front, to back.
- Align and distribute, duplicate, delete, opacity, rotation.
- Canvas ratio and the 'chrome' (the ribbon and foil frame) can be turned off for a full-bleed look.
- Undo and redo, and automatic saving.
- Colour roles (title, body, accent, foil, custom) follow the palette, so changing the palette recolours the card.

## Import your own card

Upload an image of an invitation you already have. It becomes the full-canvas background (with an optional overlay), and you can keep layering text, shapes and the entry seal on top. Remove it any time from the Simple panel.

## The entry seal and the access pass

If the card has an entry seal, each guest's copy shows their own code inside it. The seal is added automatically (`ensureEntrySeal`) when you send passes, so a guest always has a way in. A guest who has not accepted yet sees the card without the seal. If the design has no seal, the guest page falls back to a plain code line, and the desk can also find them by name. See [Check-in](check-in.md).

## One renderer everywhere

The overview preview, the designer, the guest's personal page and the film finale all draw the card with the same `InvitationCard` component from the same saved design, so a host never sees two different cards for one wedding.

## Limits

- Pictures are capped at **5 MB**.
- A layer's width cannot go below 5% (the server refuses smaller).
- Not built yet: multi-select and groups, guides, gradients, more fonts, on-canvas text editing, PDF import, PNG/PDF export. See [Roadmap](roadmap.md).

The editing maths runs in a small Rust engine compiled to WebAssembly, with a TypeScript fallback if it cannot load. See [Design engine](design-engine.md).
