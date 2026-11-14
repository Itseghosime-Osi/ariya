# Àríyá, AI-first: plan and checklist

Status: **plan only, nothing built.** Building starts when the owner says go.

## Goal

A host can run the whole app, including the invitation studio, by talking to their own AI app (Claude, ChatGPT or similar), and the result shows up inside Àríyá at once, without copying, pasting or refreshing. Using the AI should feel like part of Àríyá, not a second product.

## Decisions so far (owner)

| Question                             | Decision                                                                                                                                                                                                      |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Where does the AI live?              | **Connect-your-own only.** No built-in assistant for now. It is revisited when the product is "making waves" (Option 4 below).                                                                                |
| Who pays for AI usage?               | The host's own AI subscription. Àríyá carries no AI bill. (Cost estimate for a built-in assistant is kept for later: about $0.003 per task on Haiku, $0.05 on Sonnet, per the Claude pricing page, Nov 2026.) |
| How do AI edits in the studio apply? | **Apply at once; one Undo reverses the whole AI change.** Anything that reaches guests (email, reminders) stays approve-first.                                                                                |
| Languages                            | **English only** for now.                                                                                                                                                                                     |
| Domain email                         | `ariyaday.com` is verified in Resend.                                                                                                                                                                         |
| In scope now                         | **Option 1** (open-in-AI buttons) and **Option 2** (live sync), plus the minimum studio tools so there is something to sync.                                                                                  |
| Left for later                       | Option 3 (bring your own API key) and Option 4 (Àríyá's own assistant).                                                                                                                                       |

## What exists today

- A connected AI app can read events, guests, RSVPs, seating and the hall, create and update events and guests, adjust the invitation page's theme and four text fields, and **propose** (never perform) sending invitations, sending reminders, a hall layout and a seating plan. Everything runs as the signed-in host, honours per-event access and read-only mode, and is logged.
- The studio saves with an **optimistic revision**: a save is refused if the event changed elsewhere ("changed in another tab"). Autosave, draft recovery and Undo exist.
- Realtime is already used in one place (check-in), so the pattern is known.
- The AI **cannot** edit design layers, fonts, sizes or positions, apply a template, or see the card.

## What changes

```
Host asks their AI  ->  AI calls Àríyá's studio tools  ->  design saved (new revision)
        ^                                                          |
        |                                    the open studio hears about it
   "Open in AI" button                                             v
   (prefilled prompt)                    shows the change, one Undo step "AI: <summary>"
```

## Phases

**Phase 1 (now, after go-ahead):** workstreams A to E below.
**Phase 2 (later, needs owner decisions):** AI can run the rest of the app: tasks, vendors, run sheet, check-in reads, budget, outward messages as new proposal kinds. See "Open questions".

---

## Checklist

Size: S = small, M = medium, L = large. Every item says how we will know it is done.

### A. Open-in-AI (Option 1)

- [ ] **A1 (S) Confirm how each AI app takes a prefilled prompt.** Check the current link formats for Claude and ChatGPT (and whether a link can name the Àríyá connection). Done when: a short note records what works today, with a link tested by hand in each app. _Not verified yet; do this before building the buttons._
- [ ] **A2 (M) Prompt library.** Ready-made English prompts per place: studio ("make the names bigger and add a gold rule under them"), seating, guests, RSVPs. Each names the event so the AI starts in the right place. Done when: every prompt is a tested example that works against the real tools.
- [ ] **A3 (M) "Ask your AI" button in the studio and on the event overview.** One tap opens the AI app with a prefilled prompt for this event; also a "Copy prompt" fallback. Done when: it works on desktop and phone, the event id never leaks to the wrong person, and it is keyboard and screen-reader usable.
- [ ] **A4 (S) Not connected yet?** The button leads to the existing connect wizard, then back. Done when: a new host goes from the button to a working connection in under three minutes (timed, scripted).
- [ ] **A5 (S) Public "Connect your AI" page** with the prompts and a plain statement of what the AI can and cannot see or do. Done when: it is linked from the menu and the connect wizard, and the permissions statement matches the actual tools (checked by a test that compares the page to the tool list).

### B. Live sync (Option 2)

- [ ] **B1 (M) Tell the open studio when the design changed elsewhere.** Realtime on the event's design, with a polling fallback every few seconds. Done when: a design saved by a tool reaches an open studio within 2 seconds on desktop and on a throttled phone.
- [ ] **B2 (M) Apply the change as ONE undo step labelled "AI: <summary>".** Only when the person has no unsaved edits. Done when: Undo restores the previous design exactly, and Redo brings the AI change back (unit test on the document history).
- [ ] **B3 (M) Conflict handling.** If the host has unsaved edits when the AI change arrives, show "Your AI changed the card" with _Apply it (Undo available)_ or _Keep mine_. Done when: neither choice can lose work, and the revision check still protects against overwriting.
- [ ] **B4 (S) Say what changed.** A short notice ("Your AI changed the date line and the font"), taken from the activity log entry for that change. Done when: the notice shows within a second of the change and is announced to screen readers.
- [ ] **B5 (S) Same sync for seating, guest list and RSVPs** where the AI writes today (guest add/update/import, approved proposals). Done when: an open page updates without a reload.
- [ ] **B6 (S) Offline and flaky networks.** A change that arrives while offline is applied when the connection returns. Done when: a scripted offline/online run ends with the same design on screen and in the database.

### C. AI-drivable studio (the minimum so there is something to sync)

All tools validate against the saved-design schema, respect locked layers, never remove the guest entry seal, and write through the same revision check as the studio.

- [x] **C1 (M) Read the whole design.** Layers with ids, kinds, text, fonts, sizes, positions, theme, palette, canvas, brand styles, and the list of available fonts, themes and layout presets. Done when: an AI can describe the card accurately from this alone. Built as `get_invitation_design`.
- [x] **C2 (M) A layout check the AI can read.** Because the AI cannot see the card, a tool reports overlaps, text that leaves the card, long names that need shrinking, and low contrast, using the same rules the studio already uses. Done when: it flags the known long-name case and a deliberately broken layout. Built as `check_invitation_layout` (also flags tiny text and words over the entry seal).
- [ ] **C3 (M) Edit text and style:** change the words, font, size, weight, case, alignment, colour role. Done when: each is one tool call and one undo step in the studio.
- [ ] **C4 (M) Move and size layers; add and remove text and shapes; reorder.** Done when: the entry seal and locked layers are protected, and the 60-layer limit gives a clear message.
- [ ] **C5 (M) Apply a theme, a layout preset or a canvas size.** Done when: results match what the same action does in the studio.
- [ ] **C6 (S) Brand styles:** create a style, put it on lines, update it. Done when: changing one style changes every line that follows it, as in the studio.
- [ ] **C7 (M) Replace the whole design** (power tool) with a full validated design, for "design me a card in emerald and gold". Done when: invalid designs are refused with a message the AI can act on, and the previous design stays one Undo away.
- [ ] **C8 (S) Updated server instructions** so AI apps know the workflow: read the design, edit, run the layout check. Done when: a scripted session from a blank prompt produces a sensible card.

### D. Trust and safety

- [ ] **D1 (S) Guest text stays data.** Names and notes returned by the new tools carry the same "untrusted text" marking. Done when: a test with an injected instruction in a guest note changes nothing.
- [ ] **D2 (S) Read-only and per-event access** apply to every new tool. Done when: each tool has a refused-when-read-only test and a wrong-event test.
- [ ] **D3 (S) Rate limits and size limits** on AI writes. Done when: a runaway loop is stopped with a clear message and does not flood the history.
- [ ] **D4 (S) Activity log** records every AI design change with a human summary (feeds B4). Done when: each tool writes one entry.
- [ ] **D5 (S) Outward actions stay approve-first.** A test fails if any new tool can send to a guest directly.
- [ ] **D6 (S) A "what your AI can see" statement** in the connect flow (guest names and numbers are shared with the AI app they choose). Done when: it is shown before the first connection is approved.

### E. Marketing and proof

- [ ] **E1 (S) A 20-second demo script**: connect, "make my invitation emerald and gold, names bigger", watch it appear, press Undo. Recorded by the owner on a real account.
- [ ] **E2 (S) Landing page and product page copy** for "use your own AI, you stay in control".
- [ ] **E3 (S) Measure it**: how many hosts connect, how many AI changes are kept versus undone (anonymous, per event, using the existing metrics approach). Done when: a weekly number exists.
- [ ] **E4 (M) A real-device check** with at least three real hosts on their own phones, recording where they stall.

## Risks

- **The AI cannot see the card.** Mitigation: C2 (layout check) and keeping edits small and undoable.
- **AI and host edit at the same time.** Mitigation: B3 plus the existing revision check.
- **AI apps differ** (Claude vs ChatGPT) in how they call tools and take prompts. Mitigation: test both, keep prompts plain.
- **Link formats change.** A1 may find that prefilled prompts work in one app only. The copy-prompt fallback covers that.
- **Hosts will blame Àríyá for AI mistakes.** One Undo, the change notice and the activity log are the answer.

## Open questions (Phase 2, not needed to start Phase 1)

1. Tasks and vendors: direct AI writes (like adding a guest), or approval? (Suggested: direct, since nothing leaves the account.)
2. Do vendors have email addresses in the data? Vendor messages depend on it.
3. How is the budget stored? Budget watch depends on it.
4. Is a guest photo recap in scope? It needs photo storage that does not exist.
5. When we add other languages, who reviews the Yoruba, Igbo and Hausa wording?

## Later: Options 3 and 4

- **Option 3, bring your own API key:** a command box inside Àríyá using a key the host pastes. Few couples have one, so only if asked for.
- **Option 4, Àríyá's own assistant:** the only truly in-app route. Cost estimate above; needs a usage limit per event, a hard monthly cap on the provider account, and a model mix (cheap model for simple tasks, mid-tier for design). Revisit when usage justifies it.
