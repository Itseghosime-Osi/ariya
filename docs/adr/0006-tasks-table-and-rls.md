# ADR 0006: The `tasks` Table and its RLS Model

## Status

Accepted (2026-11-06)

## Context

The checklist page is generated from the plan: the hall, the venue, the guest count and the service style produce a list of 25–40 dated tasks, refreshed as the plan moves. Three things make a naive `tasks` table the wrong shape:

1. **Generation must be idempotent.** Regenerating after a guest count changes must update the affected rows, not add a second copy of each.
2. **Deleting a task is a signal.** A host who removes "buy the aso-ebi" is saying something, and a regeneration that brings it back is the app arguing with them.
3. **Several people share one list**, with different rights. A couple reads everything but can only move what is assigned to them; a staff member on the day reads the run sheet and nothing else.

## Decision

1. **`unique (event_id, source_key)`.** Every generated row carries a stable key derived from its rule (`template:{id}`, `risk:{ruleId}`), so regeneration reconciles by key rather than by position or title. Adding the same risk twice is a no-op.
2. **Deletion is a tombstone, enforced by a partial unique index.** A deleted row keeps its key with `deleted_at` set; live rows are covered by a partial unique index. The generator can therefore never resurrect a row the host removed, and a later re-add still has the key to collide with.
3. **Advice is stored, and its origin is frozen.** `mitigation` is what the practice says to do, `advice_source` is where it comes from, and `derivation` is why this plan earned the row. `guard_task_identity` refuses any update that changes them, so a row cannot rewrite its own advice to dodge the next regeneration.
4. **RLS by role, not by table.** Members read the whole list. Owner and planner write. A couple or staff member may only update rows assigned to them. The open question of a `contributor` role stays deferred; adding it later is a policy change, not a schema one.
5. **The engine is pure; the server action re-reads.** The generator runs where the wasm is, and `seedChecklistAction` re-reads the event and the rows before writing, because the caller may be a page that has been open for an hour.
6. **Server surfaces use the session client.** The ICS export and the checklist reads go through the RLS-scoped client, so a stranger with a guessed event id gets nothing without a special case. The weekly digest is the one exception: it runs from the service role behind a constant-time bearer secret, because it needs to see every user's week at once.

## Consequences

- **Positive:** regeneration is safe to call often (a guest count edit can refresh the list without duplicating it); a deletion sticks; the run sheet can be cached offline without leaking another celebration; and the advice on a row is auditable back to its rule.
- **Negative:** rows are never physically deleted for events still in use, so a heavily edited checklist keeps its tombstones — bounded by the ~40-row template, not a concern in practice.
- **Tests:** the policies, the uniqueness constraint and the tombstone behaviour are covered by pgTAP (`19_tasks.test.sql`, `20_digest_log.test.sql`); the reconciliation itself is covered in `checklist.rs`.
