# Usability review fixes — 21 Nov 2026 test event

Source: the planner usability review of the "QA Usability Review — 21 Nov" event
(event on Sat 21 Nov 2026, 2:00 PM WAT). Each item says what was wrong, where it lives
and how it was resolved. Tick an item only when the fix is merged and verified.

## P0 — wrong information

- [ ] **1. Event Settings shows 1:00 PM for a 2:00 PM WAT event.** The form sliced the
      stored UTC timestamp instead of converting to Lagos time; saving would shift the event
      an hour early. `features/events/components/EventSettingsForm.tsx`
- [ ] **2. Registry summary shows 0 awaiting while the filter shows 1.** Awaiting was
      derived as `total − accepted − declined` across mixed units.
      `features/guests/components/GuestRegistryMetrics.tsx`
- [ ] **3. "Everything is on track" at 65% readiness with an open task and unpaid balance.**
      The fallback ignored unpaid balances and open (not yet overdue) vendor tasks.
      `features/events/lib/overview-insights.ts`
- [ ] **4. Checklist highlights tasks due months before an event that is tomorrow.**
      Backward-scheduled due dates in the past need clamping and a "late start" treatment.
      `crates/studio-core/src/checklist.rs`, `features/checklist`
- [ ] **5. Checklist needs a saved hall plan before it generates.**
      `features/checklist/queries.ts`

## P1 — confusing or error-prone

- [ ] **6. "Next Saturday" picks the Saturday after next.**
      `features/events/components/wizard/Steps.tsx`
- [ ] **7. RSVP form hides the date and venue until after acceptance.**
- [ ] **8. Setup pre-fills a date, Lagos, colours and 2 people per invitation as if chosen.**
- [ ] **9. Headcounts differ (confirmed / expected / catering portions) with no explanation.**
- [ ] **10. Event details are edited in three places with no explanation of what each changes.**
- [ ] **11. Run sheet has only broad slots, no editable timed schedule.**
- [ ] **12. Seating: unexpected movement, chair totals, save reliability (earlier review).**
      Re-verify against the fixes in `b28f954` and `2466a58`.

## P2 — simplification

- [ ] **13. Advanced tools sit at the same level as the everyday workflow.**
- [ ] **14. AI connections and approvals appear before an event exists.**
- [ ] **15. Intro asks for colour, sound and viewing mode before any value.**
- [ ] **16. Poetic labels where literal ones would scan faster.**

## Untested — needs a manual run before charging ₦50,000

- [ ] **17. Check-in at the door** (paywalled during the review)
- [ ] **18. Team invitations and collaboration** (paywalled during the review)
- [ ] **19. CSV import, message sending, payment, offline behaviour**
- [ ] **20. 3D seating on a real device with WebGL**
