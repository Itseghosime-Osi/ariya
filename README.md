# Àríyá by OwambePlan

In-house experiment for Tech4Youth Edo, Module 06, Project 36: a wedding and event planner for Nigerian couples and planners, replacing guest lists and RSVPs scattered across WhatsApp groups. **OwambePlan** is the product; **Àríyá** (ah-ree-YAH, Yoruba for merriment) is its consumer-facing name.

## Pages

| Path | What it is |
|---|---|
| `/` (`index.html`) | The cinematic home: live 3D ring box with a "Colour of the day" picker (burgundy, emerald, olive) that recolours the velvet box and every invitation; a WhatsApp storm that collapses into one list; a wax-sealed envelope that opens into a foil invitation you can accept, which flips into your place card; a giant foil "yes"; the live 3D hall filling seat by seat; fanned invitations; the finale |
| `product.html` | What Àríyá does: invitations and RSVP, guests and seating, vendor checklist, how it works |
| `pricing.html` | Pay-per-event pricing (placeholder prices) and questions |
| `planner.html` | Demo planner: guests, CSV import, seating, vendors, on sample data |
| `rsvp.html?g=<token>` | A guest's own invitation and RSVP page |
| `film.html` | "The Yes", the full cinematic film; always starts from the beginning; `?velvet=` sets the box colour |

`assets/score.js` is the home page music. For the class demo the Music button fades in and loops `assets/music.mp3` ("Yori Yori" by Abefe); if that file is missing or can't play, it plays an original owambe groove generated live with the Web Audio API (juju and highlife feel in 12/8: agogo bell, shekere, talking drum, highlife guitars, bass, horn hook). Music only starts when a visitor taps Music. Commercial songs are copyrighted: fine for a private class demo, but don't publish them on a public site without a licence.

`assets/fine-card.js` draws the foil invitations, place cards and wax seals in SVG (corner roses, laurel monogram, embossed crest), styled in `assets/ariya.css`.

## What is real and what is sample

Everything in the planner and RSVP pages runs on **sample data** in `assets/demo.js`, kept in `sessionStorage` for the current tab only. Nothing is sent: no invitations, SMS, WhatsApp messages, emails or payments. Every demo surface says so. Pricing is labelled as placeholder.

`assets/demo.js` models the project's entities, **events, guests, RSVPs, tables and vendors**, and exposes the operations the UI needs (`respond`, `assign`, `unassign`, `previewImport`, `commitImport`, `counts`, `seatsUsed`). Replacing it with API calls is the integration point.

### Still needed for a live product

- Accounts and authentication for couples and planners
- A database and API for events, guests, RSVPs, tables and vendors (the shapes in `demo.js`)
- Unguessable per-guest tokens issued by the server, so RSVP links can't be enumerated
- Sending: confirmation emails (e.g. Resend), SMS/WhatsApp delivery of links
- Payments per event (e.g. Paystack or Flutterwave)
- Server-side CSV parsing and validation mirroring `previewImport`

## Design system

`assets/ariya.css`: deep emerald and warm ivory alternate by section, champagne gold is an accent. Bodoni Moda for emotional headlines, Figtree for everything people read or operate, Pinyon Script only for names on paper. Status always pairs colour with a word. Buttons are at least 44px tall, focus is always visible, and `prefers-reduced-motion` removes transitions.

The hero still life and the guest-experience sequence are 2.5D (layered HTML and CSS), not WebGL, so they load instantly, stay sharp, and work everywhere. The RSVP form never depends on animation.

## Run it

Static files, no build step. Serve the folder (the film fetches its HDRI):

```
npx serve .
```

## Credits

`assets/hall.exr`: Poly Haven "hall" HDRI (CC0), via `@pmndrs/assets`. three.js 0.169 from jsDelivr (film only).
