# Usability review fixes — 21 Nov 2026 test event

Source: the planner usability review of the "QA Usability Review — 21 Nov" event
(event on Sat 21 Nov 2026, 2:00 PM WAT). Each item says what was wrong, where it lived and how it
was resolved. Paths are under `apps/web/src` unless they say otherwise.

## P0 — wrong information

- [x] **1. Event Settings showed 1:00 PM for a 2:00 PM WAT event.** The form sliced the stored UTC
      timestamp, and the server reads the field as WAT, so saving unchanged moved the event an
      hour early. Now converts with `formatWatDatetimeLocal`, and the preview label uses
      `formatEventDate`. `features/events/components/EventSettingsForm.tsx`.
      Tests: round-trip unit test in `lib/format.test.ts`; end-to-end test in
      `e2e/02-events.spec.ts` ("event settings shows the WAT time…"), which fails on the old code
      with "1:00 PM" and passes on the fix.
- [x] **2. Registry summary showed 0 awaiting while the filter showed 1.** Awaiting was worked out
      as invited seats − attending − declined; a plus-one pushed attending above invited seats
      and hid the pending party. Now counts pending people directly (`pendingGuests`), and the
      party tile is labelled "Parties to reply". `features/guests/components/GuestRegistryMetrics.tsx`,
      `features/guests/stats.ts`. Test: the review's exact scenario in `lib/metrics.test.ts`.
- [x] **3. "Everything is on track" at 65% readiness with an open task and an unpaid balance.**
      The overview now nudges open tasks due before the day and unpaid vendor balances (within
      30 days), and only says "Everything is on track" when tasks are done and vendors are paid;
      otherwise "Nothing urgent right now" lists what is still open.
      `features/events/lib/overview-insights.ts`. Tests: the review's scenario and the wording,
      in `overview-insights.test.ts`.
- [x] **4. Checklist highlighted tasks due months before an event that is tomorrow.** Rows already
      past due when they were added are kept apart: they no longer pick the "next" task or the
      current phase, show "Before you started" instead of a red date, and a card offers to set
      them all aside. `features/checklist/late-start.ts` (+ tests), checklist page.
      End to end: `e2e/38-checklist-late-start.spec.ts` (event tomorrow, no hall: the list opens on
      "Day of", 18 earlier rows are set apart and can be set aside together).
- [x] **5. Checklist needed a saved hall plan before it would generate.** It now builds from the
      date, guest count and table count, treating the room as an indoor hall until a hall plan
      exists (no tent, weather or outdoor rows). `features/checklist/queries.ts`.
      When a hall is drawn later, opening the checklist adds only the rows it lacks (e.g. a
      marquee's rain and wind plans); existing rows keep the host's edits and deleted rows stay
      deleted. `features/checklist/plan-sync.ts` (+ tests), `addMissingPlanRowsAction`.
      End to end: the second test in `e2e/38-checklist-late-start.spec.ts`.

## P1 — confusing or error-prone

- [x] **6. "Next Saturday" picked the Saturday after next.** Replaced with "This Saturday · 21 Nov"
      and "Saturday after · 28 Nov": the chip names the date.
      `features/events/components/wizard/Steps.tsx`.
- [x] **7. RSVP form hid the date and venue until after acceptance.** The form now shows date and
      time (WAT), venue and area, and dress code above the reply.
      `features/rsvp/components/RsvpInteractiveForm.tsx`.
- [x] **8. Setup pre-filled a date, Lagos, colours and an invitation estimate as if chosen.** No
      date is chosen until the host picks one; area and dress code start empty; the palette only
      colours the preview. The invitation count says it is a rough guess that replies replace.
      `features/events/components/CreateEventWizard.tsx`, `wizard/Steps.tsx`;
      e2e helper picks a date explicitly.
- [x] **9. Head counts differed with no explanation.** The overview's "Expected on the day" now
      says how it is worked out ("3 confirmed + 50% for walk-ins. An estimate for plates and
      souvenirs, not a headcount."). Seating's catering panel already explains its count
      (plus-ones, vendors, spare food). `features/events/components/desk/GuestConstellation.tsx`.
- [x] **10. Event details were edited in three places without saying which changes what.** Event
      Settings and the Page Editor now say which fields are the event's details (read by the
      guest page, invitations and passes) and which only change looks. The Invitation Designer
      already offers to refresh its copy when those details change.
- [x] **11. Run sheet had only broad slots, no editable timed schedule.** Before the day, hosts can
      set an exact time on any row and add their own timed rows ("Caterer arrives, 10:00"). Rows
      sort by the clock, with worded slots placed where their words say. Locked on the day, as
      before. Set-aside rows no longer show. `features/day-of/order.ts` (+ tests),
      `features/checklist/actions.ts` (`setRunSheetTimeAction`, `addRunSheetRowAction`),
      `day-of/RunSheetClient.tsx`.
- [x] **12. Seating: unexpected movement, chair totals, save reliability (earlier review).**
      Fixed in `b28f954` and `2466a58` before this review. Re-verified on 20 Nov 2026: `05-seating`,
      `24-seating-workspace` and `30-seating-safety` (including "a failed save says Not saved, and
      Retry saves it") pass.

## P2 — simplification

- [x] **13. Advanced tools sat at the same level as the everyday workflow.** Sidebar: Planning
      holds Guests, Invitations, Reminders, Seating, Vendors, Checklist; On the day holds Run
      sheet and Check-in; Manage holds Event settings, Team, Billing; the Page editor moves to
      Design tools. Hall studio leads with "Seat guests", then "Room", then "Estimates
      (optional)" for catering, cooling and risk. `components/layout/nav-items.ts`,
      `features/seating/hall/studio-config.ts`.
- [x] **14. AI connections and approvals appeared before an event existed.** The top bar leaves
      both out until the account has an event (a waiting approval still shows). Both stay in
      Settings. `components/layout/top-bar.tsx`; `e2e/events-home.spec.ts` asserts it.
- [x] **15. The home page's intro asked for colour, sound and viewing mode before any value.**
      The gate now leads with "Start planning" (or "Go to dashboard"); "Watch the film" and the
      colour choice come second, and the colour is marked optional. `components/film/`.
- [x] **16. Poetic labels.** "Your constellation" → "Who's coming"; "The vendor loom" →
      "Vendors"; "The contracts, woven" → "Paid and owed"; checklist row "Hold the hard stops" →
      "Keep to the fixed times" (`crates/studio-core/src/checklist.rs`, wasm rebuilt, wire
      snapshot updated; the run sheet still recognises the old wording on existing events).

## Previously untested

Run locally on 20 Nov 2026 against a local Supabase stack, 42 end-to-end tests across the
specs below, all passing.

- [x] **17. Check-in at the door.** `06-check-in` and `35-offline-check-in` pass end to end with
      a paid (mocked) event.
- [x] **18. Team invitations and collaboration.** `07-team` passes.
- [x] **19. CSV import, message sending, payment, offline behaviour.** `03-guests-and-import`,
      `04-rsvp-and-email` (email through Mailpit), `08-billing` (Paystack mocked),
      `18-offline-run-sheet` and `35-offline-check-in` pass. Not covered: a real Paystack charge
      and real WhatsApp/email delivery, which need a manual pass on staging.
- [ ] **20. 3D seating on a real device with WebGL.** Cannot be run in a cloud container; needs a
      manual pass on a phone and a laptop.
