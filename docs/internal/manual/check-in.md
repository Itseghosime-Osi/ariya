# Check-in desk

Scan or type a code, confirm who it is, then tap Admit.

Audience: Reception staff, hosts and planners

> Archived from the former public manual. Internal reference only; content reflects the product at the time it was archived.

`/events/[id]/check-in` is the reception desk. The rule it enforces: **nobody is let in until you tap Admit**. Verifying a pass only shows who it belongs to.

## Three ways to find a guest

1. **Scan** the entry seal with the camera.
2. **Type the personal entry code** (for example `ARY-7K2M-99NP`). Capitals are applied for you.
3. **Search by name** if the guest cannot find their code. Results show the party, table and status, and you can verify from there.

## Verify, then Admit

- A result card shows the guest, party size, table and any problem (already admitted, did not accept).
- **Admit** records the arrival and its time and updates the counts live.
- The **Admissions Activity Log** lists the latest arrivals with party size, table and Lagos time.

## The numbers

The header shows admitted of expected, the attendance rate and a progress bar, plus Awaiting Arrival and Confirmed RSVPs. A 'Live updates on' chip shows the realtime link is active.

## Who can use it

Owner, Planner, Couple (view) and Staff (scan and admit). Staff cannot see billing. See [Roles and team](team.md).

> Under the hood: Name search is the database function `search_check_in_guests`, limited to staff-and-up of that celebration. Admission uses `check_ins` rows and `check_in_code`.
