# The Venue Studio — development checklist

**Status:** ready to start
**Date:** 2026-11-05
**Source:** [research and design](../research/2026-11-05-venue-studio.md)
**Scope:** the 3D seating studio (`/events/[eventId]/seating`), venue typologies, auto-layout, thermal modelling, catering quantities, risk advisory, and the checklist page.

---

## 0. Scope decisions

Two topics were removed from the research document and are **out of scope** for this build. Do not reintroduce them as "small additions".

| Removed                                | What that means here                                                                                                                                                                          |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Licensing and permits**              | No Licensing Act / TEN content, no permit checklist, no "licensing check" generated task, no permit row in the risk register. The product does not advise on whether an activity is licensed. |
| **Dietary requirements and allergies** | No dietary-requirement capture, no allergy flags on the seating plan, no per-guest dietary counts in catering. Catering computes _quantities_, not _suitability_.                             |

Consequences to design around:

- The risk register ships **without** the "Missing permits" row. Fire safety, insurance, noise curfew and capacity rows stay — they are safety and contract facts, not licensing.
- The checklist generator ships **without** the "Alcohol on the plan → licensing check" rule. Alcohol still drives catering quantities and bar staffing.
- Catering has no "how many vegetarian meals" output. If a user needs it, that is a future feature with its own liability review, not a field on this one.
- Copy must not imply legal or medical assurance. The thermal model is a screening tool; the risk register is practitioner judgement, labelled as such.

---

## 1. Ground rules

### 1.1 Commands

| Task         | Command             |
| ------------ | ------------------- |
| Dev server   | `pnpm dev`          |
| Lint         | `pnpm lint`         |
| Types        | `pnpm typecheck`    |
| Unit (TS)    | `pnpm test`         |
| Unit (Rust)  | `pnpm test:rust`    |
| DB tests     | `pnpm test:db`      |
| E2E          | `pnpm test:e2e`     |
| Rebuild wasm | `pnpm build:wasm`   |
| Bundle guard | `pnpm check:bundle` |
| Format       | `pnpm format`       |

### 1.2 Definition of done (every task)

- [ ] Code merged behind a flag if it changes existing behaviour.
- [ ] Unit tests cover the new logic; golden cases from the research doc are asserted, not eyeballed.
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:rust` green.
- [ ] No new `any`; wire types come from the generated file, never hand-written.
- [ ] User-facing copy passes the plain-language table (research §I.2) and reads at grade 6–8.
- [ ] Every derived number has a "how we got this" disclosure (research §I.3).
- [ ] Accessibility: 44 px targets, 4.5:1 contrast, keyboard path for every drag, live-region progress.
- [ ] Works at 390 px and 1440 px.

### 1.3 Verified starting facts

| Fact                                        | Where                                                                                                   |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Hall model, packing, arrange, checks, tests | `apps/web/src/features/seating/hall/` (`model.ts`, `fit.ts`, `arrange.ts`, `checks.ts`, `hall.test.ts`) |
| 3D renderer (iframe)                        | `apps/web/public/hall3d/hall3d.js`                                                                      |
| Existing Rust pipeline                      | `crates/render-core`, `crates/render-wasm`, `packages/render/src/index.ts`                              |
| Wasm build script                           | `apps/web/scripts/build-wasm.mjs` → `apps/web/public/wasm/ariya_render.wasm`                            |
| Layout persistence                          | `events.hall_layout` jsonb, ≤ 64 KB (`supabase/migrations/20261029120000_event_hall_layout.sql`)        |
| Seating route                               | `apps/web/src/app/(shell)/(app)/events/[eventId]/seating/page.tsx` → `SeatingDesk`                      |
| CI jobs today                               | format, lint, typecheck, unit, build, pgTAP, bundle check, Playwright — **no Rust job**                 |
| `render-core` deps                          | none — `studio-core` must add `serde` + `serde_json`                                                    |

---

## Phase 0 — Foundations

Goal: a Rust core that reproduces today's behaviour exactly, behind a loader that can fail safely.

### 0.1 Crate and workspace

- [x] **0.1.1** Add `crates/studio-core` to the workspace members; `serde` + `serde_json` deps; `lib.rs` with module stubs from research §G.2.
- [x] **0.1.2** Add `crates/studio-wasm` as a `cdylib`; depend on `studio-core`.
- [x] **0.1.3** `studio-core` depends on `render-core` for `XorShift32` and `hash_str` — one RNG shared with the renderer.
- [x] **0.1.4** `cargo test --workspace` passes with the new crates empty.

### 0.2 Geometry port

- [x] **0.2.1** Port `footprint`, `gapBetween`, `extents`, `gapToZone`, `gapToWalls` from `model.ts` to `geometry.rs`.
- [x] **0.2.2** Port `fitTables` and `checkHallPlacement` from `fit.ts` / `checks.ts`.
- [x] **0.2.3** Build a generated corpus (≥ 500 layouts: random room sizes, table mixes, rotations, zones) committed as a fixture. _(693 cases — 320 tables in rooms from 8 m to 60 m, 200 pairs, 160 zone gaps, 13 fits.)_
- [x] **0.2.4** Parity test: Rust output equals TS output on the corpus, to 1e-9. This is the gate for retiring TS geometry later.

### 0.3 Wasm ABI

- [x] **0.3.1** Implement `ariya_studio_call(op, ptr, len) -> u64` returning `(ptr << 32) | len`, plus `ariya_free`.
- [x] **0.3.2** Ops: `VERSION`, `ARRANGE`, `SCORE`, `THERMAL`, `CATERING`, `RISK`, `CHECKLIST`. One call per user action. _(VERSION, GEOMETRY and FIT are live; the rest are declared in the loader.)_
- [x] **0.3.3** Errors return a JSON envelope (`{ ok: false, code, message }`), never a panic across the boundary. Add a `catch_unwind` wrapper.
- [x] **0.3.4** Snapshot test the wire format so a schema change is a visible diff. _(`crates/studio-core/tests/wire.rs` compares every envelope against `tests/fixtures/wire/`; `UPDATE_WIRE_SNAPSHOTS=1` rewrites them.)_

### 0.4 Type generation

- [x] **0.4.1** Define wire types once in Rust with `serde`; generate TS with `ts-rs` into `packages/studio/src/generated.ts`.
- [x] **0.4.2** CI step fails if the generated file is stale (`cargo test` regenerates and `git diff --exit-code`).
- [x] **0.4.3** Lint rule or review checklist item: no hand-written wire types in `apps/web`. _(Review item in `CONTRIBUTING.md`; the lint-rule route is blocked by the config-protection hook.)_

### 0.5 Loader and fallback

- [x] **0.5.1** `packages/studio/src/index.ts` — `loadStudio()`, typed wrappers, no raw ABI exported.
- [x] **0.5.2** Lazy-load only on the seating route; never in the root layout.
- [x] **0.5.3** On load failure: fall back to the existing TS geometry and checks, hide auto-layout options / thermal / catering, show a quiet notice. Never a broken page.
- [x] **0.5.4** Extend `build-wasm.mjs` to build both crates and emit `public/wasm/ariya_studio.wasm`; commit the artifact.
- [x] **0.5.5** Extend `check-bundle.ts` so the studio wasm is not pulled into app chunks. _(Fails if the artifact is missing from `public/wasm`, emitted into `.next/static/chunks`, or inlined as base64 in any chunk.)_

### 0.6 CI

- [x] **0.6.1** Add a `rust` job: `cargo fmt --check`, `cargo clippy -- -D warnings`, `cargo test --workspace`.
- [x] **0.6.2** Add a wasm build check: build succeeds and the committed artifact matches a fresh build.
- [x] **0.6.3** Cache `~/.cargo` and `target/` to keep the job under 10 minutes.

**Phase 0 exit:** Rust reproduces today's layouts bit-for-bit; the page behaves identically with the wasm present or absent.

---

## Phase 1 — Venue model

Goal: the studio can describe a marquee, garden, field, beach, rooftop, church — and the renderer shows it.

### 1.1 Model

- [x] **1.1.1** `VenueType` enum (11 variants) and `VenueProfile` in `venue.rs`, matching research §H.1.
- [x] **1.1.2** `normaliseLayout` v2: add `venue` with default `{ type: "hall", environment: "indoor" }`; every existing document keeps working.
- [x] **1.1.3** Per-type constants: `AREA_PER_DINER` becomes a per-venue-type value (research §A.3).
- [x] **1.1.4** Round-trip test: v1 document → v2 → v1-compatible read, no data loss; 64 KB guard still enforced.

### 1.2 Questions

- [x] **1.2.1** Encode the per-type question sets from research §A.2 as a form schema (one schema per type, shared fields factored out). _(`venueFormSchema(type)` derives each field's validator from the question itself, so the bounds shown and the bounds enforced are the same numbers.)_
- [x] **1.2.2** Only ask what changes the design — no field without a consumer in the solver, thermal, risk or checklist. _(Every question carries `feeds`; a test proves each names a real consumer and that all four systems are fed.)_
- [x] **1.2.3** Venue picker in Simple mode: picture cards, not a dropdown. _(Lives in the Room deck of the studio; Simple mode itself is Phase 7.)_
- [x] **1.2.4** Studio mode: venue facts panel, editable, with the same schema. _(`VenueFacts` renders `questionsFor(type)` and reports `venueFormIssues` inline; numeric selects now store numbers, which fixed a `"3"` written where `Structure.legModule` expects `3`.)_

### 1.3 Renderer

- [x] **1.3.1** Venue shells in `hall3d.js`: marquee (leg grid + fabric), garden (grass, trees, sky), field, beach, rooftop, church. _(The shell branches on the venue the layout already carries. A tent gets legs on its module and a fabric roof that fades as the camera rises over the eaves; a garden gets grass and trees; a rooftop a parapet; a church a sanctuary step, altar, chancel rail and aisle runner. Pews are not drawn — the seating is what the host is arranging.)_
- [x] **1.3.2** Marquee leg-grid snapping: tables snap to the 3 m / 5 m module. _(Legs sit at half-module offsets, so snapping to module multiples puts a table between legs rather than on one. Alt still turns snapping off.)_
- [x] **1.3.3** Environment: sun position from date/time/location, sky gradient, wind direction indicator, rain toggle. _(The host's sun wins; without one a seasonal arc from the month keeps an unanswered venue from being lit from a direction that could never happen. Rain is drawn as streaks and offered only where there is sky above the tables.)_
- [x] **1.3.4** Pass the same JSON document to the iframe — the renderer must not become a second model. _(The renderer reads `state.layout` and derives venue, ground, sun and snapping from it; it stores nothing the app does not send.)_
- [x] **1.3.5** Non-visual equivalent: table list + text summary of the layout (research §I.5). _(`LayoutSummary` in the Room deck: venue, size, every table with seats and position, every area, in plan order. Each table focuses the view.)_

**Phase 1 exit:** a user can pick "marquee", answer six questions, and see a marquee with a leg grid and a sun position.

---

## Phase 2 — Auto-layout

Goal: three explainable options instead of one.

### 2.1 Generators

- [x] **2.1.1** `archetype.rs`: the ten generators from research §B.2 (`rounds-rows`, `rounds-staggered`, `long-tables`, `u-shape`, `theatre`, `cocktail`, `cabaret`, `chevron`, `perimeter`, `long-banquet`).
- [x] **2.1.2** `zones.rs`: candidate zone strategies per archetype (stage on short wall / long wall / centred, etc.), not a single hardcoded point.
- [x] **2.1.3** Each generator returns placements + the zone strategy it used, so the UI can explain the option.

### 2.2 Scoring

- [x] **2.2.1** `score.rs`: the weighted objective from research §B.2, with every term individually computable.
- [x] **2.2.2** Sightline: angle from stage axis, distance band, pillar occlusion by raycast.
- [x] **2.2.3** Circulation: grid flood-fill from the entrance; every table reachable; centre aisle and buffet corridor checked.
- [x] **2.2.4** Service: distance to nearest buffet and bar, weighted by table size.
- [x] **2.2.5** Symmetry, comfort, egress (24 m), penalties (overlap, wall breach, zone clearance, capacity overrun).
- [x] **2.2.6** Score breakdown is serialisable — the UI shows it verbatim.

### 2.3 Search

- [x] **2.3.1** `search.rs`: enumerate archetypes × zone strategies × lattice offsets (100–300 seeds), score, keep top K.
- [x] **2.3.2** Annealing per seed: translate 0.25 m, swap, rotate 90°, move zone. 5,000–20,000 iterations.
- [x] **2.3.3** Seed from `hash(eventId + layoutVersion)`; same inputs → same three options on every device.
- [x] **2.3.4** Property tests: no overlaps, all tables inside walls, deterministic for a given seed.
- [x] **2.3.5** Performance: 300 tables, 3 options, < 150 ms. If over, cut iterations before archetypes.

### 2.4 UI

- [x] **2.4.1** `ARRANGE` returns ranked options; UI renders the top three as cards with seats, table count and the one-line trade-off. _(The fit deck asks the engine for three options and renders each as a card: seats, table count, and the trade-off the score chose to name. Wiring it up exposed two engine bugs — circulation marked every table unreachable, and one head table sized the whole lattice — both fixed in `score.rs` and `archetype.rs`. The seeded hall then placed 18 of 25; a staggered grid that kept the square row pitch, and a wall-margin comparison that lost the first row and column to the last bit of a float, were costing it three more. It now places 21, and the four that do not fit are the dance floor and the stage.)_
- [x] **2.4.2** "Why is A better?" opens the score breakdown. _(Each card's "Why?" opens the full breakdown term by term, with the raw measure, its contribution and the sentence the engine wrote for it.)_
- [x] **2.4.3** Choosing an option is one tap and one undo step. _(Applying is a single `hall.update`, so one undo returns the hall exactly as it was; verified in the browser.)_
- [x] **2.4.4** Flag: switch between "current" and "new" layouts for comparison during rollout. _(After applying, a Compare bar flips the hall between the layout you had and the new one. Flipping uses a history-free `replace`, so comparing never fills the undo stack; "Keep this" settles on whichever is showing, and any edit or undo ends the comparison.)_

**Phase 2 exit:** the studio offers three ranked, explainable layouts and the user can pick one.

---

## Phase 3 — Thermal

Goal: "it will be 29 °C and damp; splits won't fix it" — with the arithmetic shown.

### 3.1 Model

- [x] **3.1.1** `load.rs`: sensible and latent balances, SHR, room temperature given installed capacity (research §C.4). _(Magnus for the moisture content, Stull for the wet-bulb. The worked example reproduces at 132 kW and SHR 0.57; two rows of the research table do not survive the arithmetic and are noted where they are asserted.)_
- [x] **3.1.2** `units.rs`: split AC catalogue (1.0–2.5 HP), nameplate derate, starting surge, SHR at rating and in humid air. _(The count is on the sticker, because that is what a supplier quotes; the derate shows up in the room temperature the model then predicts, not in a hidden oversize.)_
- [x] **3.1.3** Infiltration ACH as a **visible, adjustable input** with plain-language labels — it is the dominant uncertainty. _(The engine field and the `THERMAL` request both carry it; the Cooling deck's "How leaky is the room?" slider writes it to `venue.cooling.ach`, and the target temperature sits beside it.)_
- [x] **3.1.4** Marquees: ACH 5–10, and the "mechanical cooling is not viable here" verdict instead of a fantasy number. _(A marquee gets no sizing and no prediction at all — there is no honest number to give.)_
- [x] **3.1.5** Evaporative cooling: recommend only where outdoor wet-bulb < ~22 °C; Lagos never qualifies. _(Lagos sits at 30 °C wet-bulb, so the advice says evaporative cooling would add moisture rather than cool.)_

### 3.2 Field and placement

- [x] **3.2.1** `field.rs`: 0.5 m grid, unit influence `exp(−d²/2σ²)`, local load, local temperature. _(The map is a perturbation of the lumped room temperature, coupled to the mixed air at a rate set by the units' airflow — without that coupling a cell balances only against the outdoors and a dance floor at three times the average load comes out 70 K hot. Summing the local balances returns the lumped one exactly, so the map's mean is the number the sizing already quotes.)_
- [x] **3.2.2** AC placement UI: add, move, delete units; wall / cassette / floor mount; inverter toggle. _(The Cooling deck adds a unit either by clicking the floor or with "Add one", which is the keyboard path; units are dragged in the 3D hall, resized 1–2.5 HP, switched between wall, cassette and floor, and deleted. Each is drawn where it sits, so the plan and the map agree.)_
- [x] **3.2.3** Heat-map overlay in the 3D view, with a legend and a non-visual table equivalent. _(The field is painted on the floor from a canvas texture, with a toggle; the same numbers are read out as a table of mean and peak temperature by area, warmest first.)_
- [x] **3.2.4** Dance floor modelled as a separate zone, expected 2–3 K warmer. _(The worked hall puts it 2.7 K above the mean, inside the research's band; the test pins it there rather than at "warmer than average".)_

### 3.3 Output

- [x] **3.3.1** Verdict copy: target temperature, predicted temperature, humidity verdict, and the SHR sentence in plain language. _(The engine writes the headline and the reasons; the deck leads with them and names the target the host set.)_
- [x] **3.3.2** "How we got this" sheet: inputs, rule, source — the research §I.3 example is the template. _(A disclosure under the verdict: the load split, the rule the model applies, and the research sections it comes from.)_
- [x] **3.3.3** Generator load and condensate volume derived from the AC set (research §C.8). _(The plant panel shows running and starting draw and litres an hour, computed from the units actually placed — the research's 22–38 L/h does not follow from its own latent heat, so the model does the multiplication and lands near 60 L/h.)_
- [x] **3.3.4** Golden test: 30 × 20 × 5 m, 300 guests, Lagos → 130.5 kW, SHR 0.58, 19 × 2.5 HP. _(`the_worked_example_lands_on_130_kw_and_nineteen_units` asserts 130.5 ± 2 kW and SHR 0.58 ± 0.02; the model lands at 132.2 kW and 0.57 because two rows of the research table do not survive their own arithmetic, as noted in `load.rs`.)_

**Phase 3 exit:** the worked example reproduces exactly, and the page says "splits are the wrong technology" rather than "19 units".

---

## Phase 4 — Catering

Goal: a shopping list a user can take to a caterer.

### 4.1 Engine

- [x] **4.1.1** `catering.rs`: effective headcount, overage by size, style multiplier, per-item rates (research §E.9).
- [x] **4.1.2** Nigerian menu table (§E.3) as data, not code — grams internally, pieces on screen. _The per-guest grams are `const`s at the top of `catering.rs` with their research § beside them; finished dishes are derived from raw inputs (rice, oil, chicken, stock) so the list stays buyable._
- [x] **4.1.3** Drinks: alcohol split, ice, bar service, glassware.
- [x] **4.1.4** Service and equipment ratios (§E.8), including cake sizing.
- [x] **4.1.5** Low / Likely / High per line with a confidence dot; never decimals; round to purchase units.

### 4.2 Inputs

- [x] **4.2.1** Three high-leverage questions first: alcohol, cake as dessert or decoration, takeaway packs.
- [x] **4.2.2** First-class toggles: takeaway packs, vendor meals, plus-ones, overage slider. _The slider rests on the engine's own by-size figure and says what it means in words ("the usual cushion"), with a one-tap return to the default once the host has moved it. Research §E.5 asked for exactly this: a plain-language label, defaulted by headcount._
- [x] **4.2.3** Hide the alcohol section entirely when the answer is "no alcohol". _The bar's output hides — every drink line and the staffing behind `alcohol != None` — and a line of prose explains what survived (water, soft drinks, ice) with "Put the bar back" as the way out. The question itself stays on screen, because it is the control that sets the answer and hiding it would strand a host who changed their mind._
- [x] **4.2.4** No dietary-requirement fields (see §0).

### 4.3 Output

- [x] **4.3.1** Shopping list grouped by purchase unit (kg, crates, cases, bags, pans, pieces).
- [x] **4.3.2** PDF export matching the on-screen list. _Both carry a per-guest figure under each line — "≈ 0.45 kg per guest" — from the same formatter, because a host has no feel for 160 kg and every caterer does. Weights keep two decimals there: rounding 0.45 to 0.5 is an 11 % drift on the number a host is most likely to check._
- [x] **4.3.3** Golden test: 300-guest Nigerian reception → ~92 kg jollof, ~270 kg ice, 12 servers, 4 stations. _Ice, servers and stations match exactly. Jollof comes out 160 kg, not 92: the §E.10 table is 300 × 280 g × 1.10, which drops both the effective headcount (plus-ones, vendors) and the 1.45× buffet multiplier that §E.9's own formula applies. `the_research_table_is_lower_than_its_own_formula` pins the gap so nobody quietly bends the model back to the table._
- [x] **4.3.4** Caveat surfaced in the UI: figures are defensible estimates with a ±20 % band, not cited standards.

**Phase 4 exit:** the worked example matches on everything but jollof, which diverges for a stated reason (4.3.3), and the list is exportable.

---

## Phase 5 — Risk advisory

Goal: specific, dated advice — not "ensure adequate fuel".

### 5.1 Engine

- [x] **5.1.1** `risk.rs`: rule engine over the plan; each rule has a trigger, a mitigation with a number, and a "when to act".
- [x] **5.1.2** Encode the register from research §D.1 **minus the "Missing permits" row**.
- [x] **5.1.3** "When to act" resolves to a real due date from the event date.
- [x] **5.1.4** Likelihood and impact labelled as practitioner judgement, not actuarial.

### 5.2 UI

- [x] **5.2.1** Risk panel grouped by category, safety-critical visually distinct from experiential.
- [x] **5.2.2** Each row expands to the mitigation text and its source.
- [x] **5.2.3** "Add to checklist" creates a task with the derivation attached.
      The key is `risk:{ruleId}`, so adding the same risk twice is a no-op rather than a duplicate,
      and the tombstone plus the live-only partial unique index mean a row the host deleted is never
      resurrected. `getAddedRiskIds` reads the keys back on load, so the button says "On the
      checklist" after a reload instead of offering the add again.

**Phase 5 exit:** every risk shown carries a number and a date.

---

## Phase 6 — Checklist page

Goal: one place to track everything, generated from the plan.

### 6.1 Data

- [x] **6.1.1** Migration: `public.tasks` per research §H.2, with the `unique (event_id, source_key)` constraint.
- [x] **6.1.2** RLS: members read; owner and planner write; a couple or staff member reads the whole list but may only move rows assigned to them (open decision 6 stays deferred, so no `contributor` role).
- [x] **6.1.3** pgTAP tests for the policies and the uniqueness constraint.
- [x] **6.1.4** Regenerate `database.types.ts`.

### 6.2 Generation

- [x] **6.2.1** `checklist.rs`: template (25–40 tasks) + generation rules from research §F.5, **minus the licensing rule**.
- [x] **6.2.2** Stable `source_key` per generated task; regeneration is idempotent and never duplicates.
- [x] **6.2.3** Every generated row stores its `derivation` and shows it ("because your hall has 30 tables").
- [x] **6.2.4** Never resurrect a deleted task; deleting is a signal.
- [x] **6.2.5** Version templates so an update does not duplicate existing tasks.
- [x] **6.2.6** Invalidate dependents when a parent changes (guest count, venue type, service style).

### 6.3 UI

- [ ] **6.3.1** Phase rail: current phase expanded, next phase collapsed but visible, completed collapsed to a line.
- [ ] **6.3.2** Next best action card: title, why-now, one button, "show me something else".
- [ ] **6.3.3** Task row: ≥ 44 px, checkbox, title, meta line, detail sheet with mitigation and source.
- [ ] **6.3.4** Filters: mine / ours / waiting on / this week, as a sticky chip row.
- [ ] **6.3.5** Progress: ring for the event, bar for the phase; lead with done; overdue is neutral, not red; one-tap "move all to this week".
- [ ] **6.3.6** "Waiting on" as a distinct state from "not started".
- [ ] **6.3.7** Undo toast (5 s) for every reversible action; dialogs only for the irreversible.
- [ ] **6.3.8** Seed the list on first run from the hall plan — never an empty panel.

### 6.4 Reminders and offline

- [ ] **6.4.1** Notification permission requested in context, not at launch.
- [ ] **6.4.2** Weekly digest by default; obvious in-app off switch; quiet hours.
- [ ] **6.4.3** ICS export of due dates. No two-way sync.
- [ ] **6.4.4** Day-of mode: separate offline-first surface, run sheet with times, contacts and hard stops.
- [ ] **6.4.5** Service worker caches the run sheet; test with the network off.

**Phase 6 exit:** a couple can open the page on a phone, see one next action, tick it, and the list survives a reload with no signal.

---

## Phase 7 — Polish

- [ ] **7.1** Simple mode: six questions → plan, three options, temperature verdict, shopping list, checklist.
- [ ] **7.2** Mode switch in the header; both modes write the same document.
- [ ] **7.3** Explainability sheets on every derived number.
- [ ] **7.4** Accessibility pass: axe clean at 1440 and 390 on every new surface; keyboard alternative for every drag; reduced motion; 200 % zoom.
- [ ] **7.5** Playwright flows: pick a venue → auto-arrange → compare options → place an AC → read the verdict → generate the checklist → tick a task.
- [ ] **7.6** Performance test in CI: 300-table arrange < 150 ms.
- [ ] **7.7** Update `docs/architecture.md` and the research doc's status line.
- [ ] **7.8** Remove the "current vs new" layout flag once the new path has run a release.

---

## Cross-cutting

### Security and data

- [ ] Every new server action re-checks event membership; RLS is the backstop, not the only check.
- [ ] `hall_layout` stays under 64 KB — venue facts are small, but AC arrays and zone strategies can grow. Add a size test.
- [ ] No guest PII in the layout document or the wasm payload.
- [ ] Catering and thermal are computed on read; only user overrides are stored.

### Performance

| Operation                                 | Budget   |
| ----------------------------------------- | -------- |
| Full auto-arrange (300 tables, 3 options) | < 150 ms |
| Re-score one layout                       | < 5 ms   |
| Thermal field (600 m² at 0.5 m)           | < 30 ms  |
| Catering + risk + checklist               | < 10 ms  |
| wasm download (gzipped)                   | < 250 KB |

### Documentation

- [ ] ADR for the Rust core and the JSON ABI (follows `docs/adr/0001`–`0004`).
- [ ] ADR for the `tasks` table and its RLS model.
- [ ] Note in the research doc that licensing and dietary are out of scope, with the date.

---

## Open decisions — resolve before Phase 1

| #   | Decision                                 | Recommendation                                                                                                                                       |
| --- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | One market or many?                      | Nigeria-first: keep the Nigerian power and harmattan rows, keep fire and insurance as generic safety, drop England/Wales-specific compliance detail. |
| 2   | One event or two (ceremony + reception)? | Model it in the data before the UI; the insurance market already treats 2 + 2 as normal.                                                             |
| 3   | Show the SHR verdict to everyone?        | Yes in Studio mode; in Simple mode show the plain-language sentence only.                                                                            |
| 4   | Store catering overrides?                | Yes, small jsonb on the event, so numbers do not move under the user.                                                                                |
| 5   | Offline story for day-of?                | Service worker with the run sheet cached is the minimum; decide before Phase 6 ships.                                                                |
| 6   | Add a `contributor` role?                | Defer unless a vendor-facing feature lands; it is a schema and RLS change.                                                                           |

---

## Suggested sequencing

Phases 0–2 are the core of the ask and should ship together. Phases 3–6 each depend on the plan being trustworthy, so they follow in order. Phase 7 is continuous — accessibility and copy checks belong in every phase, not at the end.
