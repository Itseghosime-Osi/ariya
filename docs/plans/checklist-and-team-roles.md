# Checklist and team roles: features to build

Goal: the checklist becomes the planner's own. They shape each event's list, keep reusable checklists
for any event, and work through it with their team, each person seeing what their role allows.

Tick an item when it is built and tested; **(PR pending)** marks work on a branch that is not merged yet. Sizes: **S** about a day, **M** a few days, **L** a week
or more.

## What exists today

- **Team roles:** Owner, Lead Planner, Couple (view only) and Staff (door and check-in). People are
  invited by email; once they accept, the event shows in their own account.
- **Checklist permissions in the database:** owners and planners can add, edit and delete tasks;
  other members can only move a task assigned to them between to-do, waiting and done.
- **Checklist:** generated from one fixed set of 23 tasks, adapted to the date, guests, tables, venue
  and month. You can tick, mark "waiting", delete and restore, move open tasks to this week, and add
  to a calendar.
- **Gaps:** you can't add or edit tasks; there's no picker for assigning a task; the event type chosen
  in setup isn't saved; there are no reusable checklists; the navigation shows every page to every
  role.

## Who can do what (target)

|                                         | Owner | Lead Planner             | Couple           | Staff                                          |
| --------------------------------------- | ----- | ------------------------ | ---------------- | ---------------------------------------------- |
| See the event's checklist               | All   | All                      | All              | Only tasks assigned to them, and the run sheet |
| Tick a task                             | Any   | Any                      | Assigned to them | Assigned to them                               |
| Add, edit, delete, reorder tasks        | Yes   | Yes                      | No               | No                                             |
| Assign tasks                            | Yes   | Yes                      | No               | No                                             |
| Comment on a task                       | Yes   | Yes                      | Yes              | On tasks assigned to them                      |
| Apply a reusable checklist to the event | Yes   | Yes                      | No               | No                                             |
| Own reusable checklists                 | Yes   | Yes                      | No               | No                                             |
| Manage the team's shared checklists     | Yes   | Yes, if the owner allows | No               | No                                             |

## Done alongside release 1

- [x] **Checklist page redesign (PR pending).** Tasks grouped by when they are due (Overdue, This
      week, This month, Later, No date, Done) instead of by stage; one "Add a task" action; a
      progress card with counts per group; two columns on wide screens, one on phones; Back and Add
      in the installed app's bar on a phone. Stage names stay on each task.

## Release 1: roles and the planner's own checklist

Team-role items (1–4) are deferred to their own PR.

- [ ] **1. Pages match the role** (M). The sidebar, phone menu and pages show only what a role can
      use. Staff land on check-in and the run sheet; the couple sees the overview, guests, seating and
      checklist read-only. _Benefit:_ each person sees a clean, relevant app instead of pages that
      refuse them.
- [ ] **2. Checklist controls match the role** (S). Add, edit, delete and assign appear only for
      owners and planners; others see "assigned to you" tasks they can tick. The database already
      enforces this; the screen will match it. _Benefit:_ no buttons that fail when pressed.
- [ ] **3. Assign tasks to team members** (S). An owner picker on each task, from the event's team.
      The "Mine" filter already exists. _Benefit:_ everyone knows what's theirs.
- [ ] **4. "My tasks" across all my events** (M). One page listing every task assigned to me, across
      every event I'm on, by due date. _Benefit:_ staff and planners working several events see their
      week in one place.
- [x] **5. Add your own task** (S) **(PR pending)**. Built without the owner field, which comes with team roles. Title, phase, notes, owner, and a due date that is either fixed
      or relative ("3 weeks before"), so it moves when the event date moves. _Benefit:_ covers
      everything the generated list can't know, such as aso-ebi money or the talking drummer.
- [x] **6. Edit any task** (S–M) **(PR pending)**. Wording, details, due date and phase, including generated tasks.
      Your edits are never overwritten when the list refreshes. _Benefit:_ the list speaks the
      planner's language.
- [ ] **7. Save the event type and start from a matching list** (M). Wedding, engagement/introduction,
      naming, birthday, owambe, remembrance, corporate. The type can be changed later in Event
      Settings. Needs a database column and new lists in the planning engine; the wording for each
      type must be checked by a planner before release. _Benefit:_ a naming ceremony stops getting
      wedding tasks.
- [ ] **8. My reusable checklists** (M). An account page to create, edit, rename and delete
      checklists that don't belong to any event; you can keep several (e.g. "Full traditional
      wedding", "Small naming"). _Benefit:_ a planner sets up their method once.
- [ ] **9. Save an event's list as a reusable checklist** (S). One click from the checklist page.
      _Benefit:_ the best event becomes the starting point for the next.
- [ ] **10. Use a reusable checklist on any event** (M). Add it on top of the suggested tasks, or use
      it instead of them. Due dates are worked out from the new event's date, and tasks already on
      the event aren't duplicated. _Benefit:_ no retyping 40 tasks per client: the main time saving.
- [ ] **11. "Also add to my checklist"** (S). When adding a task to an event, tick a box to add it to
      a reusable checklist too. One-off tasks still stay on that event only. _Benefit:_ reusable
      checklists improve with every event without separate upkeep.
- [x] **12. Overview counts your own tasks** (S) **(PR pending)**. The "next thing to do" and readiness score include
      custom and checklist tasks. _Benefit:_ the dashboard reflects the real plan.

## Release 2: real events and real teams

- [ ] **13. A list per ceremony** (M). A wedding with a traditional ceremony, church service and
      reception on different days gets a section for each, with its own date. _Benefit:_ matches how
      multi-day Nigerian weddings actually run.
- [ ] **14. Sub-steps within a task** (M). E.g. "Aso-ebi": agree fabric, collect payments, order,
      distribute. _Benefit:_ big jobs become trackable without cluttering the list.
- [ ] **15. Reorder and move between phases** (S–M). Drag, or use move up/down for keyboard and
      phone. _Benefit:_ the order follows how this planner works.
- [ ] **16. Mark as important** (S). A "can't miss" flag the overview always shows. _Benefit:_ the
      few critical tasks never get buried.
- [ ] **17. Comments on a task** (M). A short thread per task, visible to the team (staff only on
      their tasks). _Benefit:_ decisions stay with the task instead of getting lost in WhatsApp.
- [ ] **18. Notes, links and photos on a task** (M). Attach the signed contract, a receipt, a
      contact. _Benefit:_ the task holds its own evidence.
- [ ] **19. Team checklists** (M). Reusable checklists shared across a planning firm's team, so every
      staff member starts from the same method. _Benefit:_ consistent quality, faster training of
      new staff.
- [ ] **20. Checklist changes don't disrupt running events** (S–M). Editing a reusable checklist
      changes new events only, unless you choose to update existing ones. _Benefit:_ no surprise
      changes in the middle of a client's wedding.
- [ ] **21. Reminders** (M). A weekly email or WhatsApp digest of what's due, and overdue nudges to
      the person assigned, respecting quiet hours. _Benefit:_ tasks get done without the planner
      chasing everyone.
- [ ] **22. Link tasks to vendors and payments** (M). "Pay the caterer's balance" is tied to the
      vendor and the amount, merging the vendors page's own task list into the checklist. _Benefit:_
      one list instead of two; balances never forgotten.

## Later

- [ ] **23. Print or PDF the checklist** (S). For planning meetings and families who prefer paper.
- [ ] **24. Activity history** (S–M). Who added, changed, ticked or reassigned what, and when.
      _Benefit:_ accountability in a team, and an answer to "who changed this?"
- [ ] **25. More suggestions from event details** (M). Extend today's venue-based and risk-based tasks
      to guest count, budget and season. _Benefit:_ catches what a busy planner forgets.
- [ ] **26. Draft a checklist with AI** (M). "Naming ceremony, 150 guests, Ibadan, in 5 weeks"
      produces a draft to review and edit. _Benefit:_ a useful first draft in seconds.
- [ ] **27. Learn from past events** (L). "You add 'book the talking drummer' to every wedding. Add
      it to your checklist?" _Benefit:_ reusable checklists improve on their own.

## Removed

- **Share a read-only view by link.** Dropped in favour of team roles: the couple and family join as
  team members with the Couple role and see the checklist in their own account.
