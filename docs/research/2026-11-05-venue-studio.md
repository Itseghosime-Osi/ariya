# The Venue Studio — research and design

**Status:** research complete; planned into work in [the build checklist](../plans/2026-11-05-venue-studio-build-checklist.md)
**Date:** 2026-11-05
**Scope:** the 3D seating studio (`/events/[eventId]/seating`), its auto-layout, venue coverage, thermal modelling, risk advisory, catering quantities, and a checklist page.

**Out of scope (removed 2026-11-05):** licensing and permits, and dietary requirements and allergies. The product does not advise on whether an activity is licensed, and catering computes quantities rather than suitability. See §0 of the build checklist.

---

## 0. Executive summary

The studio today is a good **hall** designer. The ask is to make it a good **venue** designer, and to make the plan it produces _do work_: tell the couple how hot the room will be, what to buy, what can go wrong, and what to do next.

Eight findings shape everything below.

1. **The current auto-layout optimises one thing: how many tables fit.** It tries straight and staggered lattices at a handful of offsets and keeps the arrangement with the most tables, breaking ties on symmetry (`fit.ts:79-143`). That is a packing algorithm, not a design algorithm. It cannot prefer a layout that seats two fewer tables but gives every guest a clear view of the stage, or that keeps the buffet queue out of the main aisle.
2. **Venue type is not a cosmetic skin — it changes the geometry, the rules and the advice.** A marquee has a 3 m or 5 m leg grid, a design wind speed and no meaningful envelope. A rooftop has a live-load limit. A church has fixed pews. A field has no services at all. The model must carry these as first-class facts, not as a background image.
3. **Split AC cannot cool a large occupied hall, and the app should say so.** A 30 × 20 × 5 m hall with 300 guests in Lagos needs roughly **130 kW (37 tons)** of cooling, of which **55 kW is latent**. That is 19 × 2.5 HP units. The honest output is "splits are the wrong technology here — you need a packaged unit with outdoor air", not a unit count. This is the single most valuable thing the thermal feature can tell a user.
4. **The dominant thermal uncertainty is infiltration, not people.** A factor-of-3 error in air changes swings the total load by ~40 %. It must be a visible, adjustable input, not a hidden constant.
5. **Catering accuracy comes from three questions, not from gram tables.** Whether alcohol is served, whether the cake is dessert or decoration, and whether takeaway packs are expected each swing the answer by 20–100 %. Ask those first; the per-guest rates are secondary.
6. **Risk advice is only useful if it is specific and dated.** "Ensure adequate fuel" is noise. "Fuel for the day plus 4 hours" is a task. Every risk should carry a mitigation with a number and a "when to act" that becomes a due date.
7. **The checklist must be a view over the plan, not a second document.** The differentiator over a spreadsheet is that the hall _causes_ tasks: 30 tables generates "confirm 30 linens", and the row shows its derivation. Duplicate lists are the number-one failure mode of wedding tools.
8. **Rust is the right choice for the computational core and the wrong choice for the UI.** The repo already has the pattern: `crates/render-core` → `crates/render-wasm` → `packages/render`. Extending it with a `studio-core` crate gives a fast, deterministic, testable solver that can later be shared with the (currently empty) mobile app via UniFFI. It does not, by itself, make the page easier to use — that is a UX problem, addressed in Part I.

---

## 1. Where the studio is today

| Layer       | File                                                          | What it does                                                                   | What it cannot do                                                                         |
| ----------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| Model       | `apps/web/src/features/seating/hall/model.ts` (700 lines)     | Room in metres, zones, décor, table/chair geometry, footprint maths, gap tests | One room shape (rectangle). No venue type, no environment, no services.                   |
| Packing     | `hall/fit.ts` (191 lines)                                     | Lattice fit (rows/staggered), free-spot search                                 | One objective (count). No sightlines, service, egress.                                    |
| Auto-layout | `hall/arrange.ts` (189 lines)                                 | Fixed zone placement, then greedy group packing                                | Zones placed by hardcoded rules; greedy can strand space; no alternatives offered.        |
| Validation  | `hall/checks.ts` (177 lines)                                  | Walls, zones, table-to-table gaps, centre aisle                                | No egress distance, no capacity check, no accessibility route.                            |
| Renderer    | `apps/web/public/hall3d/hall3d.js` (2,685 lines)              | Three.js hall, tables, chairs, décor, camera, picking                          | One hall shell. No marquee, garden, field, beach, rooftop, church. No sun, wind, weather. |
| Rust        | `crates/render-core`, `crates/render-wasm`, `packages/render` | Story map, easing, RNG, hashing, C-ABI + TS loader                             | Nothing venue-related.                                                                    |
| Persistence | `events.hall_layout` jsonb (≤ 64 KB)                          | Room, zones, décor, rotations, chairs                                          | No venue facts, no AC, no catering, no tasks.                                             |

The existing code is well-factored: pure functions, tested (`hall.test.ts`, 279 lines), and the Rust boundary is already established. That is a good starting position — this is an extension, not a rewrite.

---

## 2. Design principles for the expanded studio

1. **The plan is the source of truth.** Every other feature (thermal, catering, risk, checklist) reads the plan. None of them keeps its own copy of the guest count or the table count.
2. **Two modes, one model.** _Simple_ asks six questions and produces a plan. _Studio_ exposes every control. Both write the same document.
3. **Explain every derived number.** A number the user cannot audit is a number they will not trust. Every computed figure gets a "how we got this" disclosure.
4. **Ranges, not false precision.** "About 85 kg" reads as expertise; "84.3 kg" reads as a bug.
5. **Say when the answer is "don't".** A marquee cannot be air-conditioned; a 1,000-guest hall cannot be served by 12 splits. The product's credibility comes from refusing to compute a fantasy.
6. **Deterministic and undoable.** Same inputs, same layout. Every auto-action is reversible in one step.

---

## Part A — Venue typologies

### A.1 The typology set

Ten types cover the market. Each is a distinct _model_, not a theme.

| Type                            | Envelope        | Ground                    | Structure constraint                                             | Services               | Dominant design driver                                     |
| ------------------------------- | --------------- | ------------------------- | ---------------------------------------------------------------- | ---------------------- | ---------------------------------------------------------- |
| **Pillar-free hall / ballroom** | Sealed          | Slab                      | Clear height 4–9 m; rigging from roof steel (verify point loads) | Mains, 3-phase         | Column-free span sets max tables; ceiling sets stage/scrim |
| **Pillared hall**               | Sealed          | Slab                      | Column grid, often 6–9 m                                         | Mains                  | Columns are sightline breaks — model as obstacles          |
| **Clearspan / frame marquee**   | Fabric          | Grass, gravel or deck     | 3–40 m clearspan; legs every 3 m or 5 m                          | Generator              | Wind + anchoring; leg grid the layout must snap to         |
| **Pole tent**                   | Fabric          | Grass (stakes only)       | Guy ropes extend metres beyond canvas                            | Generator              | Guy-line footprint often exceeds the tent                  |
| **Stretch tent**                | Fabric          | Grass, level-ish          | Irregular; sides raiseable                                       | Generator              | Organic shape — no rectangular grid                        |
| **Garden / lawn**               | Open            | Grass, may be waterlogged | Whatever you bring                                               | Long runs or generator | Drainage, slope, trees, neighbours                         |
| **Open field / farmland**       | Open            | Soil, uneven              | Unlimited                                                        | Generator only         | Ground bearing, mud, services from zero                    |
| **Beach / waterfront**          | Open            | Sand, tidal               | Tents with sand anchors/ballast                                  | Generator              | Tide line, wind, sunset azimuth                            |
| **Rooftop / terrace**           | Open, high wind | Structural deck           | Live load 40 psf residential, 60–100 psf commercial/assembly     | Mains or small gen     | Structural load budget; no rain plan                       |
| **Church / religious**          | Sealed          | Stone/tile                | Fixed pews, columns, low nave                                    | Mains                  | Immovable geometry; ceremony→reception transfer            |
| **Hybrid**                      | Split           | Split                     | Two venues                                                       | Two supplies           | Transition time; enforce the tighter capacity              |

### A.2 What the planner must be asked, per type

The studio should ask only what changes the design. These are the questions that do.

**Hall / ballroom:** internal clear dimensions; column grid; ceiling height; rigging points and rated load; load-in door width/height and dock; power (amps/phases); existing bar and toilet capacity; the venue's **certified** capacity; curfew and noise limits; parking count.

**Marquee (all kinds):** structure type and clearspan; leg module; **design wind speed** and monitoring plan; anchoring method (stakes vs kentledge) and ground pull-test result; floor type; side-wall configuration; heating/cooling provision; truck-to-footprint distance; underground services; overhead lines; generator position; 6 m separation from other structures; exits and travel distance; **who owns the weather call**.

**Garden / lawn:** slope and drainage; ground type and waterlogging history; tree positions and canopy height; underground drains and cables; gate width and carry distance; neighbour sightlines and noise sensitivity; where the catering tent, toilets, generator and parking go.

**Open field:** landowner permission; ground bearing and mud risk; trackway requirement; mowing and clearing; water supply; distance to mains; toilet and parking from zero; emergency vehicle route (4 m wide, 4.5 m headroom, 12.5 t); nearest hospital.

**Beach:** guest cap and footprint limits; tide table for the date; erosion and lifeguard flags; wind and sand strategy; sunset azimuth; access path; what happens if the tide or wind turns.

**Rooftop:** permitted live load (psf or kN/m²) and the structural engineer's sign-off; lift capacity and route; wind exposure at height; parapet heights; no-penetration constraint; rain plan; power; toilet access; neighbour noise.

**Church:** seating capacity and seats per pew; aisle width; whether aisle seating is permitted; florals/arch fixing rules; photography and processional restrictions; time slot including setup and clear-down; distance and travel time to the reception; guest count at each site.

**Hybrid:** both of the above, plus capacity reconciliation, transition time, transport, and which venue owns the weather decision.

### A.3 Space per guest — the numbers

| Use                        | Planning figure                                | Legal floor                                      | Source                                                  |
| -------------------------- | ---------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------- |
| Seated at rounds (banquet) | **1.2–1.5 m²/guest** (1.4 for comfort)         | IBC 15 net sq ft = 1.39 m²; UK ADB 1.0 m² dining | IBC Table 1004.5; ADB Vol 2 Table 2.2; MUTA BPG Table 3 |
| Theatre / ceremony rows    | 0.55–0.75 m²                                   | IBC 7 net sq ft = 0.65 m²                        | IBC Table 1004.5                                        |
| Cocktail / standing        | 0.5–0.7 m²                                     | IBC 5 net sq ft = 0.46 m²; ADB 0.3 m²            | IBC; ADB                                                |
| Dance floor                | 0.42 m² per dancer, ~40–50 % of guests at peak | —                                                | Rosevow; convention                                     |

The current model already uses `AREA_PER_DINER = 1.4` (`model.ts`), which is correct. It should become a per-venue-type constant rather than a single global.

### A.4 Clearances

| Rule                                   | Number    | Source                                           |
| -------------------------------------- | --------- | ------------------------------------------------ |
| Round table edge-to-edge               | 152 cm    | convention (18" chair + 24" service + 18" chair) |
| Rectangular table edge-to-edge         | 132 cm    | convention                                       |
| Table edge → occupied chair back       | 46 cm     | anthropometric                                   |
| Chair back → chair back, no service    | 41 cm     | guests pass sideways                             |
| One-way service aisle                  | 61 cm     | convention                                       |
| Two-way / trolley aisle                | 91 cm     | convention                                       |
| Accessible route, continuous           | **91 cm** | ADA 403.5.1                                      |
| Aisle accessway offset from table edge | 48 cm     | IBC 1018.2                                       |
| Table → wall                           | 91 cm     | convention                                       |

The studio's `SPACING_GAP` (0.45 / 0.6 / 0.9 m) and `WALL_MARGIN` (1.0 m) are consistent with these. `MAIN_AISLE = 1.12` is slightly generous against the 91 cm accessible route, which is fine.

### A.5 Table conventions

| Table        | Seats               | Note                                                   |
| ------------ | ------------------- | ------------------------------------------------------ |
| 60" round    | 8 (tight 9–10)      | 23.6 in of edge per guest                              |
| 72" round    | 10 (tight 11–12)    | 22.6 in each — a bigger round is _not_ more elbow room |
| 6 ft banquet | 6 (long sides only) |                                                        |
| 8 ft banquet | 8                   |                                                        |

`tableTop()` in `model.ts` already derives diameters from capacity in the right ballpark (0.91 / 1.22 / 1.52 / 1.83 m). It should be inverted: the user picks a real table size, and capacity follows.

### A.6 Fire and life safety

- **IBC:** two exits required above 49 occupants (Table 1006.2.1). Egress width 0.15 in/occupant for doors and corridors (sprinklered, voice alarm), 0.2 in for stairs.
- **MUTA (temporary structures):** travel distance to a final exit **not normally more than 24 m**; 2-minute evacuation target; one unit of exit width = **525 mm** discharging **40 persons/unit/minute**; `U = N ÷ (40 × T)`, `E = (U ÷ 4) + 1` (assume one exit unavailable); **minimum 6 m between fabric structures**; fire appliance access within **50 m**, route ≥ 4 m wide, ≥ 4.5 m headroom, 12.5 t; fire wardens above 250 occupants.
- **Nigeria:** no published national occupancy table. In practice the **Lagos State Safety Commission** issues an Event Safety Clearance and conducts pre-event risk assessment; venue capacity certificates are the operative constraint. **Do not invent a Nigerian formula** — ask for the certificate and store it.

### A.7 Weather

| Structure     | Rated      | Evacuate at         | Cancel if forecast |
| ------------- | ---------- | ------------------- | ------------------ |
| Clearspan     | 90–100 mph | 25–30 mph sustained | 40+ mph            |
| A-frame       | 80–94 mph  | 25–30 mph sustained | 35+ mph            |
| Pagoda        | 70–80 mph  | 20–25 mph sustained | 30+ mph            |
| Pop-up canopy | 15–25 mph  | 15–20 mph           | 25+ mph            |

MUTA also bars raising a roof above **15 mph**, calls for kentledge in 1000 kg / 500 kg units, ground pull-testing with a 5 t load cell, and scaffolding where ground varies by more than **0.75 m**.

### A.8 West African practice

- **Scale:** 300–1,000+ guests is normal. Lagos halls run to 1,000–3,000 for dinner (Eko Convention Centre ~3,000 banquet; Balmoral 1,500–2,500; Harbour Point 1,000). At 1.4 m²/guest, 1,000 guests is ~1,400 m² of dining floor before stage, buffet or dance floor.
- **Canopies, not ballrooms:** outdoor compound receptions with hired canopies, Chiavari chairs and rounds are the default for many families.
- **Generator power is the norm.** Plan placement, fuel, noise separation from the MC and sound, and a changeover.
- **"Spraying":** guests throw cash at the couple and performers. Design consequence: a **2–3 m clear ring** in front of the couple's table and the dance floor, a route for the MC and sprayers, no loose or fragile décor in that zone, and cash-handling security.
- **Buffet:** multiple long lines, heavy queue pressure, a second service wave. At least **one line per 100 guests**, in practice more.
- **Regulation:** Lagos Event Safety Clearance and venue capacity certificates.

---

## Part B — Auto-layout

### B.1 What is wrong with the current approach

`autoArrange` (`arrange.ts:88-178`) does three things in sequence:

1. Places zones by hardcoded rules (`arrangeZones`).
2. Places head tables in a row in front of the stage.
3. Groups remaining tables by shape/capacity, packs each group into a lattice, sorts by distance to the stage, and assigns greedily.

The failure modes:

- **One archetype.** Rows or staggered rows. No long-table, U-shape, theatre, cocktail, cabaret, chevron or perimeter layouts.
- **Greedy group order.** The largest group is packed first and can consume the best space; later groups get the leftovers.
- **No quality objective.** A layout that blocks the buffet queue scores the same as one that does not.
- **No alternatives.** The user gets one answer and no way to compare.
- **Zones are not optimised.** `arrangeZones` puts the buffet at `L * 0.55` on the left wall regardless of where the entrance, the kitchen access or the sun is.

### B.2 The replacement: archetypes × scoring × search

**Step 1 — enumerate archetypes.** Each is a generator that, given the room, zones and table inventory, proposes placements.

| Archetype          | Use                | Geometry                                       |
| ------------------ | ------------------ | ---------------------------------------------- |
| `rounds-rows`      | Banquet default    | Rounds on a rectangular lattice, aligned       |
| `rounds-staggered` | Dense banquet      | Rounds offset half a pitch per row             |
| `long-tables`      | Western / intimate | 6–8 ft banquet tables in parallel rows         |
| `u-shape`          | Small formal       | Tables on three sides of an open centre        |
| `theatre`          | Ceremony           | Chairs in rows facing the stage, no tables     |
| `cocktail`         | Drinks reception   | Poseur tables on a sparse grid, standing zones |
| `cabaret`          | Mixed              | Rounds at the back, long tables at the front   |
| `chevron`          | Feature layout     | Rows angled toward the stage                   |
| `perimeter`        | Dance-led          | Tables around the edge, dance floor central    |
| `long-banquet`     | Single-table       | One continuous table, often for 40–80          |

**Step 2 — place zones per archetype.** Each archetype carries a zone strategy: where the stage, dance floor, buffet, bar, entrance, cake, gifts and photo spot go, and which walls they prefer. The strategy is a small set of candidate positions (e.g. stage on the short wall, on the long wall, or centred), not a single hardcoded point.

**Step 3 — score.** A weighted objective, computed per candidate:

```
score =  w_seats      · seatsPlaced / seatsRequested
       + w_sightline  · mean(sightlineScore(table))
       + w_circulation· aisleContinuity
       + w_service    · mean(serviceScore(table))
       + w_symmetry   · mirrorScore
       + w_comfort    · achievedGap / requestedGap
       − w_egress     · maxEgressDistance / 24m
       − w_penalty    · violations
```

Each term is defined so it can be explained to a user:

- **Sightline:** for each table, the angle from the stage axis and the distance. Penalise beyond ±60°, penalise occlusion by pillars (raycast table centre → stage centre against pillar footprints), and penalise the "too close" band where guests crane.
- **Circulation:** a grid flood-fill from the entrance; every table must be reachable without crossing a footprint. Also checks the centre aisle and the buffet queue corridor.
- **Service:** distance from each table to the nearest buffet and bar, weighted by table size.
- **Symmetry:** share of placements whose mirror across the centre line is also a placement (already implemented in `fit.ts:146-154`).
- **Comfort:** achieved chair-back gap against the requested spacing.
- **Egress:** longest path from any table to the nearest exit, against the 24 m MUTA limit.
- **Penalties:** overlaps, wall breaches, zone clearance, capacity overrun.

**Step 4 — search.** Enumerate archetypes × zone strategies × lattice offsets (roughly 100–300 seeds), score all, keep the top K, then run a local search on each: simulated annealing with moves _translate a table by 0.25 m_, _swap two tables_, _rotate 90°_, _move a zone_. 5,000–20,000 iterations per seed. In Rust this is tens of milliseconds.

**Step 5 — return ranked options, not one answer.** The UI shows the top three as cards:

> **Option A — 28 tables, 280 seats.** Best sightlines. Buffet queue clear of the aisle.
> **Option B — 30 tables, 300 seats.** Two more tables; the back row is 22 m from the stage.
> **Option C — 26 tables, 260 seats.** Most spacious; 0.9 m between chair backs.

Each card carries the score breakdown, so "why is A better" is answerable. This directly serves the ask to "choose better design layouts" and "allow them choose".

### B.3 Determinism

Seed the search from `hash(eventId + layoutVersion)`. The existing `XorShift32` and `hash_str` in `crates/render-core/src/rng.rs` are already parity-tested against the JS implementation and can be reused. Same inputs → same three options, every time, on every device. That makes the feature testable and makes "undo" meaningful.

### B.4 What stays in TypeScript

Interactive micro-operations — dragging one table, checking one gap, snapping — stay in TS. They are already fast and the wasm boundary crossing would cost more than the computation. Rust owns the **global** operations: full auto-arrange, re-score, thermal field, catering, risk, checklist generation.

---

## Part C — Thermal: AC placement and occupied-hall temperature

### C.1 Comfort target

| Parameter                               | Value                       | Source                             |
| --------------------------------------- | --------------------------- | ---------------------------------- |
| Comfort zone (PMV)                      | −0.5 to +0.5                | ASHRAE 55 / ISO 7730               |
| Minimum satisfaction                    | 80 %                        | ASHRAE 55-2017                     |
| Seated, quiet                           | 1.0 met = 58.2 W/m²         |                                    |
| Dancing                                 | 2.5–3.0 met                 | above the standard's 2 met ceiling |
| Summer clothing                         | 0.5 clo                     |                                    |
| Max air speed, no local control         | 0.8 m/s                     |                                    |
| Humidity ratio ceiling (graphic method) | 0.012 kg/kg dry air         |                                    |
| Vertical stratification limit           | 3 °C seated / 4 °C standing |                                    |

**Recommended target for a Lagos hall:** 24–25 °C operative at 50–55 % RH for dining, 26–27 °C in circulation with fans. Do not target below 23 °C — capacity is spent on sensible cooling while the coil runs dry and the room stays humid.

**Air speed is the cheapest lever.** ASHRAE 55's elevated-air-speed adjustment raises the acceptable summer operative temperature from ~27.5 °C in still air to ~30 °C at 0.8 m/s. That is 2.5 K of comfort for the price of a ceiling fan, and 2.5 K of setpoint is worth 10–15 % of the cooling load.

**Humidity is the binding constraint in Lagos.** Outdoor air at 33 °C / 80 % RH sits at W ≈ 0.025 kg/kg — more than double the 0.012 ceiling. Dehumidification, not temperature, is what the design must solve.

### C.2 Load components

**People** (ASHRAE Fundamentals, per person):

| Activity           | Total W | Sensible W | Latent W |
| ------------------ | ------- | ---------- | -------- |
| Seated, quiet      | 100–115 | 65–75      | 30–45    |
| Standing, light    | 120–150 | 75–90      | 45–60    |
| Dancing, moderate  | 250–290 | 130–160    | 110–140  |
| Dancing, energetic | 300–350 | 150–180    | 140–170  |

At 24 °C use **70 W sensible + 35 W latent** seated, **150 W sensible + 130 W latent** dancing. Model the crowd as a weighted blend, not all-seated.

**Solar:** `Q = A_glazing × SHGC × I_incident`. SHGC 0.25–0.35 for good low-e double glazing, 0.6–0.8 for single clear glass (common locally). Peak vertical irradiance in the tropics ~400–600 W/m² east/west, 200–350 north/south; horizontal can exceed 900 W/m².

**Conduction:** `Q = Σ U_i A_i (T_out − T_in)`.

| Element                                 | U (W/m²·K) |
| --------------------------------------- | ---------- |
| Single glazing                          | 5.5–6.0    |
| Double glazing, low-e                   | 1.4–2.0    |
| 225 mm sandcrete block, uninsulated     | 1.5–2.2    |
| Block + 50 mm insulation                | 0.6–0.9    |
| Metal roof, no insulation               | 4.0–6.0    |
| Metal roof + 50 mm insulation + ceiling | 0.4–0.7    |
| Insulated concrete roof                 | 0.3–0.5    |

**Infiltration:** `Q_sens = ṁ c_p (T_out − T_in)`, `ṁ = ACH × V × ρ / 3600`, with `ṁc_p ≈ 0.32 × ACH × V` W/K. Typical ACH: 0.33 no openings, 0.67 one side, 1.0 two sides, 1.33 three sides. An occupied hall with service doors realistically runs **0.75–1.5 ACH**.

`Q_lat = ṁ × h_fg × (W_out − W_in)`, `h_fg ≈ 2.45 × 10⁶ J/kg`.

**This is the term that breaks naive sizing.** At 1 ACH in a 3,000 m³ hall, `ṁ = 0.96 kg/s`. With `W_out = 0.025` and `W_in = 0.010`, latent infiltration is **35 kW** — larger than the entire sensible load from 300 guests.

**Lighting and equipment:** LED decorative 5–15 W/m²; AV, DJ, catering, stage 3–8 kW; add 10–20 % diversity.

### C.3 Split AC sizing

1 ton = 12,000 BTU/h = 3.517 kW. The "HP" label is a marketing convention: **1 HP ≈ 9,000 BTU/h ≈ 2.64 kW**.

| Nominal | BTU/h  | kW cooling | Input kW | Amps @ 230 V |
| ------- | ------ | ---------- | -------- | ------------ |
| 1.0 HP  | 9,000  | 2.64       | 0.8–1.0  | 3.5–4.5      |
| 1.5 HP  | 12,000 | 3.52       | 1.1–1.4  | 5–6          |
| 2.0 HP  | 18,000 | 5.28       | 1.6–2.0  | 7–9          |
| 2.5 HP  | 24,000 | 7.03       | 2.0–2.4  | 9–11         |

Nameplate assumes 35 °C ambient. Apply a **10–15 % derate** for a condenser in sun. Non-inverter units have **3–5× starting surge** — 19 units starting together will trip a generator.

**Why "one unit per X m²" is wrong:** the rule encodes a residential sensible load. In a hall, people load scales with headcount not area, latent infiltration is independent of area and enormous in the humid tropics, and a split recirculates room air with **zero outdoor air** — at 300 guests and 1 ACH, steady-state CO₂ settles near **2,200 ppm**, well above the ~1,000 ppm comfort threshold.

### C.4 The model to implement

**Sensible balance:**

```
Q_cool,sens = Q_people,sens + Q_solar + Q_cond + Q_inf,sens + Q_equip
```

**Room temperature given installed sensible capacity:**

```
T_in = T_out + (Q_int,sens − Q_cool,sens) / (UA + ṁc_p)
```

**Latent balance and humidity:**

```
Q_cool,lat = Q_people,lat + ṁ h_fg (W_out − W_in)
W_in = W_out + (Q_people,lat − Q_cool,lat) / (ṁ h_fg)
```

**SHR feasibility — the most important output:**

```
SHR_required = Q_sens / (Q_sens + Q_lat)
```

A unit can only hold the target humidity if its rated SHR ≤ the required SHR. Splits run SHR ≈ 0.75–0.80 at rating conditions and 0.65–0.70 in humid air. If the hall requires 0.58 and the unit delivers 0.75, **the room gets cold and stays damp**. The app must say that.

### C.5 Worked example — 30 × 20 × 5 m, 300 guests, Lagos

Geometry: floor 600 m², volume 3,000 m³, wall perimeter 100 m, wall area 500 m², glazing 60 m², opaque wall 440 m², roof 600 m².
Assumptions: outdoor 33 °C / 80 % RH (W = 0.025); target 24 °C / 55 % RH (W = 0.010); ΔT = 9 K; roof U 0.5, walls U 1.0, glazing U 5.8, SHGC 0.6, incident 450 W/m²; 1.0 ACH; 200 seated + 100 dancing; lighting 12 W/m² + 5 kW AV.

| Component              | Calculation           | kW        |
| ---------------------- | --------------------- | --------- |
| Roof conduction        | 600 × 0.5 × 9         | 2.7       |
| Wall conduction        | 440 × 1.0 × 9         | 4.0       |
| Glazing conduction     | 60 × 5.8 × 9          | 3.1       |
| Solar through glazing  | 60 × 0.6 × 450        | 16.2      |
| People, sensible       | 200×70 + 100×150      | 29.0      |
| People, latent         | 200×35 + 100×130      | 20.0      |
| Infiltration, sensible | 963 W/K × 9           | 8.7       |
| Infiltration, latent   | 0.96 × 2.45e6 × 0.015 | 34.8      |
| Lighting + AV          | 7.2 + 5.0             | 12.0      |
| **Total**              |                       | **130.5** |

Sensible 75.7 kW, latent 54.8 kW, **SHR = 0.58** — 205 W/m², 445,000 BTU/h, **37 tons**.

- 1.5 HP units: **37 units**. Absurd.
- 2.5 HP units: **19 units**, one per 32 m².
- The residential rule (1 HP per 20 m²) gives 30 HP = 12 × 2.5 HP = 84 kW — **35 % short**.
- With no cooling, the model predicts 61 °C. The linear model over-predicts (real buildings vent), but it correctly signals that a sealed glass hall is uninhabitable.
- Fan-assisted mode at 27 °C: ~117 kW — an 11 % saving plus better perceived comfort.

**The honest conclusion:** 19 splits is not a design. It is the model saying split AC is the wrong technology. The right answer is a packaged rooftop or chiller with dedicated outdoor air and a desiccant or reheat coil for the 55 kW latent load.

### C.6 Placement and the heat map

Sizing is half the answer; distribution is the other half.

- **Count and placement:** size on load, then distribute so no occupied zone is more than ~5–6 m from a supply jet. For 30 × 20 m, a grid along the long walls, not a cluster at one end.
- **Mounting height:** wall units at 2.3–2.8 m. In a 5 m hall, mount at 4 m and throw horizontally along the ceiling (Coandă effect) so cold air mixes before it drops. Cassettes above ~4 m.
- **Short-circuiting:** keep supply and return separated; never mount above an open doorway.
- **Stratification:** cold air sinks; a hot roof creates a stable warm layer. Ceiling or HVLS fans destratify and buy the 2.5 K allowance.
- **Dance floor:** a dense crowd is a 150–200 W/m² source with high latent output. Model it as a separate zone; expect it 2–3 K warmer.

**Implementation:** grid the hall at 0.5 m. Each unit has a throw radius and CFM; influence `= exp(−d² / 2σ²)` with σ derived from throw. Local cooling = capacity × influence / Σ influence. Local load = people density + solar near glazing + equipment. Predicted local temperature from the same balance. Render as a **heat-map overlay in the 3D view** — this is the feature that makes the thermal model feel real rather than like a form.

### C.7 Marquees and outdoor venues

A marquee has no meaningful envelope. Effective ACH is **5–10**, not 1. Re-running the example at 5 ACH: sensible infiltration 43 kW, latent infiltration **174 kW**, total > 250 kW for a space where you cannot mount enough condensers.

Splits fail in marquees for three reasons: infiltration swamps any realistic capacity; there is nowhere to reject condenser heat without recirculating it into the tent; and the units cannot dehumidify 174 kW of latent load — they ice up or run continuously and fail.

**Evaporative cooling is worse in Lagos.** Direct evaporative cooling can only approach the outdoor wet-bulb. At 33 °C / 80 % RH, wet-bulb is ~28 °C, so supply air is ~28–29 °C at 70–90 % RH — which suppresses sweat evaporation and makes people feel _worse_. It is recommended only where outdoor wet-bulb stays below ~22 °C. Lagos never gets there.

**What to advise instead:** HVLS/large ceiling fans (highest value, 3–4 K of perceived comfort at near-zero energy); cross-ventilation and stack effect; shade the roof with a second fly-sheet; spot-cool the head table and VIP zone only; misting only in harmattan (Dec–Feb), never in the wet season.

**The UI must say "mechanical cooling is not viable here"** rather than compute a fantasy number.

### C.8 Practicalities

- **Electrical:** 1.5 HP draws 1.1–1.4 kW (5–6 A); 2.5 HP draws 2.0–2.4 kW (9–11 A). Stagger starts or specify inverter units.
- **Generator:** for the worked example, 19 × 2.2 kW = 42 kW AC + 12 kW lighting + 5 kW AV + ~10 kW catering ≈ 70 kW running; apply 1.3–1.5× for starting and diversity → **100–125 kVA**.
- **Condensate:** 55 kW latent removal produces roughly **22–38 L/h**. That is not a drip tray — it needs a gravity drain or pump per unit, and a plan for ~300 L over an 8-hour event. Blocked drains are the #1 maintenance failure in humid climates.
- **Noise:** indoor 24–45 dB(A), outdoor 50–62 dB(A). Nineteen outdoor units combine to ~73 dB(A). Mount condensers away from the stage, MC and microphones; never directly above the head table.
- **Maintenance:** filters monthly in dust, coils quarterly, leak check annually. A fouled coil loses 10–20 % capacity — enough to turn a marginal design into a failing one.

### C.9 Where the model diverges from real HVAC design

State these to the user:

1. Steady state ignores thermal mass — real halls lag 2–4 hours between peak gain and peak load.
2. The well-mixed assumption is false; real halls stratify and have hot spots.
3. **Infiltration ACH is the dominant uncertainty** — a factor-of-3 error swings the load ~40 %. Make it adjustable.
4. People heat gain varies ±20 % with temperature, clothing and how hard people dance.
5. Nameplate capacity is optimistic; real installed capacity is 10–20 % below the sticker and falls as coils foul.
6. Splits provide no ventilation; the model computes a latent load the equipment cannot address. That is physics, not modelling.
7. A full design uses ASHRAE's radiant time series or heat balance method, zone by zone, with a psychrometric coil model. This is a **screening tool** — good enough to say "roughly this much, and splits are/aren't the right answer", not good enough to specify equipment.

---

## Part D — Risk advisory

### D.1 The register

Each risk carries: category, likelihood, impact, a mitigation **with a number**, and a "when to act" that becomes a due date. Likelihood/impact are practitioner judgement, not actuarial — the app should label them as such.

| Category   | Risk                                             | L       | I    | Mitigation                                                                                                                                          | When                   |
| ---------- | ------------------------------------------------ | ------- | ---- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| Venue      | Guest count exceeds certified capacity           | Med     | High | Compare final RSVP against the **written** capacity; hold 5–10 % buffer; name an overflow room                                                      | Booking; T-3 wk        |
| Venue      | Blocked, locked or inward-opening exits          | Med     | High | Walk every exit; unlocked, unobstructed, opening **outward**; no storage in escape routes                                                           | Site visit; day before |
| Venue      | Marquee wind or rain failure                     | Med     | High | Engineer-certified structure and anchoring spec; side walls; pre-agreed evacuation trigger                                                          | Contract; T-72 h       |
| Venue      | Floor load / collapse (dance floor, stage, bars) | Low     | High | Ask for floor loading figures; spread heavy items; cap people on raised staging                                                                     | Site visit             |
| Venue      | Ceiling rigging failure                          | Low     | High | Rig only from certified points; request rigging certificate and weight schedule                                                                     | Vendor contract        |
| Venue      | Power outage                                     | High    | High | Dual supply; UPS on sound/AV; rehearse the changeover                                                                                               | Booking; T-1 day       |
| Venue      | Generator failure or fuel exhaustion             | High    | High | Size with 30–40 % headroom; fuel for the day **plus 4 hours**; second smaller backup; service log                                                   | T-2 wk; day-of         |
| Venue      | Water supply / tanker failure                    | Med     | Med  | Confirm source and tank capacity; tanker backup; separate potable storage for catering                                                              | Booking                |
| Venue      | Insufficient or unusable toilets                 | Med     | Med  | Ratio check; at least one accessible unit; attendant + consumables                                                                                  | T-6 wk                 |
| Weather    | Rain                                             | High    | High | Covered route between ceremony and reception; indoor fallback of equal capacity; drainage; umbrellas                                                | Date choice; T-72 h    |
| Weather    | Heat                                             | High    | Med  | Shade on all seating; water stations; fans/misting; outdoor segments early or late; medical standby                                                 | T-3 mo                 |
| Weather    | Wind                                             | Med     | High | Weighted centrepieces; no open flame; secure linens and signage; show the forecast at T-72 h                                                        | T-72 h                 |
| Weather    | Harmattan dust (Nov–Mar)                         | High    | Med  | Prefer indoor/covered; dust covers for cake and plated food; seal AV; warn guests about visibility, travel delays, dry eyes and respiratory effects | Date selection         |
| Weather    | Flooding / access-road failure                   | Low–Med | High | Check flood history and access road; raised flooring; shuttle contingency; hardstanding parking                                                     | Booking                |
| Weather    | Sun position and glare                           | High    | Low  | Model the sun path at the **actual ceremony hour**; place backdrop and shade accordingly                                                            | Design                 |
| People     | Guest overflow                                   | High    | Med  | RSVP buffer; overflow seating; standing area; second room                                                                                           | T-4 wk                 |
| People     | Uninvited guests, unearned plus-ones             | High    | Med  | Named list at the door; RSVP codes; plus-one policy on the invite                                                                                   | Invitations; day-of    |
| People     | Seating conflicts / family feuds                 | High    | Med  | "Keep apart" tags on the chart; buffer tables; discreet re-seat plan                                                                                | T-3 wk                 |
| People     | VIP protocol                                     | Med     | Med  | One-page protocol sheet; named handler per VIP; reserved seating; arrival windows                                                                   | T-2 wk                 |
| People     | Late vendors                                     | High    | Med  | Written setup window and venue access time; buffer before guest arrival                                                                             | Contract               |
| People     | No-shows                                         | Med     | Med  | Confirmation calls at T-7 and T-2; deposit-backed contracts; backup contact per critical vendor                                                     | T-1–2 wk               |
| People     | Children                                         | High    | Low  | Kids' area, activity packs, planned early exit, named supervision                                                                                   | T-6 wk                 |
| People     | Accessibility needs unmet                        | Med     | High | Step-free route; accessible toilet; reserved space; MC/sign-language provision                                                                      | At RSVP                |
| People     | Medical emergency                                | Low     | High | First-aider on site; AED location; ambulance access route; nearest hospital printed                                                                 | T-4 wk                 |
| People     | Security / theft / gatecrashing                  | Med     | High | Vetted guards; guest list at gate; bag policy; secure point for gifts and cash                                                                      | T-6 wk                 |
| Vendors    | Food runs out                                    | Med     | High | Guaranteed headcount **plus 5–10 %**; model plated vs buffet; count vendor/crew meals                                                               | Contract; T-7 d        |
| Vendors    | DJ / sound failure                               | Med     | Med  | Backup PA; offline playlist on two phones; UPS; sound check under load                                                                              | T-2 wk                 |
| Vendors    | Photographer no-show or lost files               | Low     | High | Backup-photographer clause; second shooter; dual-card backup; confirm insurance                                                                     | Contract               |
| Vendors    | Decor setup delays                               | High    | Med  | Access time in writing; crew size specified; pre-build; "venue ready" deadline on the run sheet                                                     | T-1 wk                 |
| Vendors    | Cake delivery failure or melt                    | Med     | Med  | Delivery window; refrigerated transport; indoor display away from heat; backup dessert                                                              | T-2 wk                 |
| Vendors    | Transport / shuttle failure                      | Med     | High | Confirmed fleet with driver contacts; one spare vehicle; staggered departures; return schedule                                                      | T-2 wk                 |
| Money      | Deposit loss / vendor insolvency                 | Low–Med | High | Pay by card; staged payments; verify registration; event insurance covering supplier failure                                                        | Booking                |
| Money      | Hidden fees (service, corkage, overtime, power)  | High    | Med  | Itemised quote; all-in comparison; overtime and power rates in writing                                                                              | Contract               |
| Money      | Vendor cancellation                              | Med     | High | Cancellation clause with refund schedule; tight force-majeure; backup list per vendor                                                               | Contract               |
| Money      | Currency / inflation                             | High    | Med  | Lock prices at booking; pay early; cap adjustment clauses; 10 % contingency                                                                         | Booking                |
| Programme  | Schedule overrun                                 | High    | Med  | Run sheet with explicit buffers; hard stops; MC has written authority to cut                                                                        | T-2 wk                 |
| Programme  | MC gaps / dead air                               | Med     | Med  | Scripted transitions; filler segments; MC brief with names and pronunciations                                                                       | T-1 wk                 |
| Programme  | Speeches overrun                                 | High    | Low  | Time limits in writing; speaker briefing; cue cards with a countdown                                                                                | T-2 wk                 |
| Programme  | Food service timing fails                        | Med     | High | Tie service calls to the run sheet, not the caterer's convenience                                                                                   | T-2 wk                 |
| Programme  | Power for the band                               | Med     | High | Dedicated circuit/phase; load calculation; sound check at full load                                                                                 | T-2 wk                 |
| Compliance | Noise curfew                                     | Med     | Med  | Confirm in writing; plan a sound taper; indoor option; notify neighbours                                                                            | Contract               |
| Compliance | Fire safety gaps                                 | Med     | High | Venue fire risk assessment; extinguisher count; trained marshals; MC briefing line                                                                  | Site visit             |
| Compliance | Insurance gaps                                   | Med     | High | Venue public liability; vendor PL certificates; event policy for cancellation/supplier failure                                                      | T-6–12 wk              |

### D.2 The evidence behind the ratings

- **Crowd density is the real capacity risk.** Crush risk rises past ~5 people/m²; at 6–7 movement is lost; near 10 people asphyxiate while standing. Most disasters are planning and management failures — funnelling, locked or inward-opening exits, over-capacity premises.
- **Exit failure is a recurring, specific pattern** — Stardust, Cocoanut Grove, Cromañón, Station. Exits must open in the direction of escape and be kept clear.
- **Power is structural in Nigeria.** Repeated grid collapses; self-generation has at times matched formal grid delivery.
- **Harmattan is a date-selection risk.** Late November to mid-March; RH can fall below 15 %, occasionally under 5 %; heavy dust cuts visibility for days and disrupts flights; worsens asthma, causes nosebleeds, dry eyes and chapped skin.
- **Heat:** ~489,000 heat-related deaths a year (2000–2019); Europe's summer 2022 saw ~61,672 excess deaths. WHO has guidance on heat at mass gatherings.
- **Catering:** WHO estimates ~866 million foodborne illnesses and 1.52 million deaths annually, costing US$310bn. The Five Keys to Safer Food are the standard mitigation to put in front of a caterer.
- **Insurance maps onto the register.** UK policies (£50–£300, driven by the cancellation limit) cover cancellation and rearrangement (supplier failure, venue closure, extreme weather), loss/damage/theft of cake, flowers, attire, gifts and transport, and sickness of a close relative. "Changed your mind" and weather that does not block travel are excluded — a useful honesty constraint on weather advice.
- **Fire safety for events** in England sits under the Regulatory Reform (Fire Safety) Order 2005; Home Office guidance explicitly **excludes marquees and large temporary structures**, which need separate engineering assurance.

### D.3 How to write the advice

1. **Name the trigger, not just the task.** "Book 30 tables — your hall has 30" beats "Book tables".
2. **Give the number when there is one.** "Fuel for the day plus 4 hours" is actionable.
3. **Separate "must" from "nice".** Safety-critical (exits, capacity, rigging, first aid) and experiential (cake, speeches) must never share the same red badge.

---

## Part E — Catering quantities

### E.1 The honest framing

There is no single authoritative standard for wedding catering quantities. What exists is nutrition-science portion guidance, caterer trade heuristics, and hotel F&B ratios — and they disagree by 20–40 % on the same item. **That disagreement is a design input: it is why the product outputs ranges, not numbers.**

### E.2 Food per guest

| Style                  | Total food/guest | Protein/guest | Driver                                     |
| ---------------------- | ---------------- | ------------- | ------------------------------------------ |
| Plated / seated        | 450–600 g        | 150–200 g     | Kitchen controls the portion; lowest waste |
| Buffet                 | 700–900 g        | 200–250 g     | Self-serve generosity                      |
| Family style           | 600–750 g        | 180–220 g     | Shared bowls                               |
| Cocktail / small chops | 300–450 g        | 100–150 g     | 6–10 pieces over 2–3 h                     |
| Live stations          | 500–700 g        | 180–250 g     | Throughput-limited; 2–3 returns            |

The plated-vs-buffet gap is the largest lever: a buffet needs **1.4–1.6× the food of plated for the same headcount**.

### E.3 Nigerian menu, per guest

| Item                            | Per guest        | Unit  | Note                                   |
| ------------------------------- | ---------------- | ----- | -------------------------------------- |
| Jollof rice                     | 250–300 g cooked | g     | Lower end if fried rice is also served |
| Fried rice                      | 200–250 g cooked | g     | Secondary rice                         |
| Raw rice equivalent             | 90–120 g raw     | g     | Rice ≈ 2.5–3× when cooked              |
| Beef (stewed/peppered)          | 100–150 g        | g     | 1–2 pieces                             |
| Chicken                         | 150–200 g        | g     | 1–1.5 pieces                           |
| Fish                            | 150–200 g        | g     | 1 whole or 1 large cut                 |
| Goat / ram (asun)               | 80–120 g         | g     | Snack item, not a main                 |
| Salad                           | 80–100 g         | g     |                                        |
| Pounded yam / eba / fufu / semo | 200–250 g        | g     | 1–1.5 wraps                            |
| Soup (egusi, ogbono, efo)       | 200–250 ml       | ml    | ~1 cup per wrap                        |
| Moi moi                         | 1 wrap (~120 g)  | piece |                                        |
| Fried plantain                  | 80–100 g         | g     |                                        |
| Small chops                     | 6–10 pieces      | piece | 4–6 if cocktail only                   |
| Suya                            | 2–3 sticks       | stick | ~40–60 g per stick                     |
| Cake (wedding)                  | 60–80 g          | g     | Smaller than dessert slices            |
| Cake (dessert / sheet)          | 90–120 g         | g     |                                        |

**Piece-counting is more reliable than grams in the UI.** A user can picture "1.5 pieces of chicken per guest"; they cannot picture 81 kg. Use grams internally, pieces on screen.

### E.4 Overage scales inversely with headcount

| Guests  | Overage |
| ------- | ------- |
| < 50    | 20–25 % |
| 50–150  | 15 %    |
| 150–400 | 10–12 % |
| 400+    | 8–10 %  |

This is a law-of-large-numbers argument and is defensible to state as such.

### E.5 The multipliers most calculators miss

- **Second servings:** 20–30 % of buffet guests return. Apply to main starch and protein, not sides.
- **Late arrivals:** 10–20 % arrive after service begins. This is a throughput problem more than a quantity problem.
- **Vendors and staff:** 5–10 % of guest count. Photographer, videographer, DJ, MC, planner, decorators, security, drivers, venue staff. **Always add explicitly** — the most commonly forgotten line.
- **Plus-ones / uninvited guests:** 10–15 % above RSVP for open or semi-open Nigerian events; 3–5 % for ticketed or RSVP-gated.
- **Takeaway packs:** an additional **10–20 % of main-course volume**, plus 0.5–1 pack per guest. In many regions this is a social obligation, not an option. Surface it as its own toggle — it can be 15 % of the food budget.

### E.6 Nigerian specifics

- **Takeaway packs** are the defining difference from Western models. Do not bury them in generic overage.
- **Jollof is the anchor starch** at 100 % of guests; fried rice is secondary at 60–70 %, not 100 % of both.
- **Small chops are a separate service moment**, not a side: 4–6 pieces on arrival, 3–4 late.
- **Swallow is served per wrap**, not per portion; model soup against wraps, not guests.
- **Cake is ceremonial first, dessert second.** Ask whether it is "for eating" or "for cutting" — display cakes may be largely inedible.
- **Live stations** (suya, asun, shawarma, small chops bar) reduce plated main demand by 15–25 % but add staffing and equipment.

### E.7 Drinks

| Item          | Rate                                              | Unit               | Conversion   |
| ------------- | ------------------------------------------------- | ------------------ | ------------ |
| Bottled water | 0.5 L/guest/hour; 2–3 × 50 cl per guest for 5–6 h | bottle             | 24 per case  |
| Soft drinks   | 2–3 servings/guest                                | 35 cl              | 12 per crate |
| Juice         | 1–2 glasses/guest                                 | 1 L ≈ 5–6 glasses  |              |
| Beer          | 2–3 bottles per _drinking_ guest                  | 60 cl              | 12 per crate |
| Wine          | 0.4–0.6 bottle per _wine-drinking_ guest          | 75 cl = 5 × 150 ml | 12 per case  |
| Champagne     | 1 bottle per 6–8 guests (toast only)              | 75 cl              | 6 per case   |
| Spirits       | 1 × 70 cl per 12–15 guests                        | 70 cl ≈ 15 × 44 ml | 12 per case  |
| Ice           | 0.5–1.0 kg/guest                                  | kg                 | see below    |

**Alcohol split is the assumption most likely to be wrong.** Ask directly, in plain language: _"Will you serve alcohol? (a) No alcohol at all (b) Beer and wine only (c) Full bar with spirits (d) Not sure — show me both."_ Default for a Nigerian context: 65–75 % non-alcoholic / 25–35 % alcoholic; within the alcoholic group roughly 60 % beer, 25 % wine, 15 % spirits. For a diaspora or Lagos owambe crowd, shift to 50/50. For a church or Muslim-majority event, default to zero and hide the section.

**Ice:** ~0.5 kg/guest for cooling drinks; add 0.25 kg/guest for a cold display; in 30 °C+ conditions use **0.75–1.0 kg/guest**. For 300 guests outdoors in Lagos, 225–300 kg. Bought in 20–25 kg blocks or bags — round up to whole bags.

**Bar service:** 2 drinks in the first hour, then 1 per hour. 1 bartender per 50–75 guests for a full bar, 1 per 100 for beer/wine/soft only, plus 1 bar-back per 3 bartenders. 3–4 glasses per guest for a full bar, 2 for beer/wine, plus 10 % breakage. 1 bar per 100–150 guests — err toward more bars, fewer bartenders per bar.

### E.8 Service and equipment

| Item                       | Ratio                                                    |
| -------------------------- | -------------------------------------------------------- |
| Servers — plated, formal   | 1 per 8–10 guests                                        |
| Servers — plated, informal | 1 per 12–15                                              |
| Servers — buffet           | 1 per 25–30, plus 1 carver per station                   |
| Captains                   | 1 per 8–10 servers                                       |
| Buffet stations            | 1 per 50–75 (1 per 100 if double-sided)                  |
| Chafing dishes             | 1 per 50 guests per hot item (full pan ≈ 40–50 portions) |
| Plates                     | 1.5–2 per guest                                          |
| Cutlery sets               | 1.5 per guest                                            |
| Napkins                    | 2–3 per guest                                            |
| Tablecloths                | 1 per table + 10 % spare                                 |
| Chairs                     | 1 per guest + 5 % spare                                  |

**Cake sizing:** a standard serving is 60–80 g. A 3-tier 10"/8"/6" serves ~100–120; a 4-tier ~150–200. Above ~200 guests a single tiered cake cannot serve everyone — the practical answer is a display cake plus a sheet cake, or dessert as a separate course. **Ask whether the cake is the dessert or a photo moment** — a 10× swing.

**Late-night food:** if the event runs past 4 hours or past 10 pm, add small chops, suya, shawarma or puff-puff at 3–5 pieces per guest.

### E.9 Formulas

```
guests_effective = guest_count × (1 + plus_one_rate)      # 0.10–0.15 open events
                 + vendor_meals                            # 0.05–0.10 × guest_count
                 + takeaway_allowance                      # 0.10–0.20 × guest_count (NG)

overage = f(guest_count)                                   # 0.25 / 0.15 / 0.10 / 0.08

food_item = guests_effective × per_guest_rate × (1 + overage) × style_multiplier
style_multiplier = plated 1.00 | family 1.15 | buffet 1.45 | cocktail 0.70

drinks_total = drinking_guests × rate_per_hour × hours × (1 + overage_drinks)

ice_kg = guests × ice_rate + (cold_display ? guests × 0.25 : 0)

servers  = ceil(guests / ratio_for_style)
stations = ceil(guests / 75)
chafing  = ceil(guests / 50) × hot_item_count
```

### E.10 Worked example — 300-guest Nigerian reception

Buffet, 6 hours (4 pm–10 pm), outdoor Lagos, 30 °C, beer + wine, takeaway packs, 8 % vendors, 10 % plus-ones.

Effective headcount: 300 × 1.10 = 330 + 24 vendors = **354 eating**; overage 10 % → **~390 portions**.

| Item            | Calculation                    | Result                     |
| --------------- | ------------------------------ | -------------------------- |
| Jollof rice     | 300 × 280 g × 1.10             | ~92 kg cooked (~31 kg raw) |
| Fried rice      | 300 × 220 g × 1.10             | ~73 kg cooked (~25 kg raw) |
| Chicken         | 300 × 1.5 pcs × 180 g × 1.10   | ~89 kg (~450 pieces)       |
| Beef            | 300 × 120 g × 1.10             | ~40 kg                     |
| Fish            | 300 × 1 pc × 180 g × 1.10      | ~59 kg (~300 pieces)       |
| Pounded yam     | 300 × 1.5 wraps × 220 g × 1.10 | ~109 kg (~450 wraps)       |
| Egusi soup      | 300 × 250 ml × 1.10            | ~83 L                      |
| Salad           | 300 × 90 g × 1.10              | ~30 kg                     |
| Small chops     | 300 × 8 pcs × 1.10             | ~2,650 pieces              |
| Cake (dessert)  | 300 × 80 g                     | ~24 kg (display + sheet)   |
| Water           | 300 × 2.5 bottles              | 750 × 50 cl = 32 cases     |
| Soft drinks     | 300 × 2.5 bottles              | 750 × 35 cl = 63 crates    |
| Beer            | 300 × 0.35 × 2.5               | ~260 × 60 cl = 22 crates   |
| Wine            | 300 × 0.25 × 0.5               | ~38 bottles = 4 cases      |
| Ice             | 300 × 0.9 kg                   | ~270 kg (11 × 25 kg bags)  |
| Servers         | 300 ÷ 25                       | 12 + 2 captains            |
| Buffet stations | 300 ÷ 75                       | 4                          |
| Chafing dishes  | 300 ÷ 50 × 6 hot items         | ~36 pans                   |
| Plates          | 300 × 1.8                      | ~540                       |
| Cutlery         | 300 × 1.5                      | ~450                       |
| Napkins         | 300 × 2.5                      | ~750                       |
| Chairs          | 300 × 1.05                     | ~315                       |
| Takeaway packs  | 300 × 0.8                      | ~240                       |

Note how takeaway packs and vendor meals push the real requirement ~20 % above the naive "300 × per-guest" figure. That gap is exactly what the calculator exists to expose.

### E.11 Presentation rules

1. Model in grams and pieces internally; display in pieces, crates, bags and pans.
2. Make overage a visible slider with a plain-language label ("How much spare food do you want?"), defaulted by headcount.
3. Treat takeaway packs, vendor meals and plus-ones as first-class toggles.
4. Ask about alcohol explicitly; hide the section if the answer is no.
5. Ask whether the cake is dessert or decoration.
6. Output **Low / Likely / High** with a confidence dot per line.
7. Never show decimals. Round to purchase units.

---

## Part F — The checklist page

### F.1 Six principles

1. **One source of truth.** The checklist is a _view_ over the plan, never a parallel document. Duplicate lists are the number-one failure mode of wedding tools.
2. **Phase-first, not category-first.** Couples think in time ("what do I do now"), not taxonomy. Categories are a filter.
3. **One next best action.** A single primary card, with "up next (3)" beneath it.
4. **Progress informs, it doesn't scold.** Rings orient; they never say "you're behind".
5. **Auto-generate, then explain.** The differentiator versus a spreadsheet is that the hall _causes_ tasks.
6. **Plain language, big targets, works offline.**

### F.2 Phases

| Phase          | Window                  | Character                                             |
| -------------- | ----------------------- | ----------------------------------------------------- |
| Foundations    | T-12 to T-9 months      | Venue, date, season risks, budget lock, insurance     |
| Book the day   | T-9 to T-6              | Core vendors, contracts, deposits                     |
| Build the room | T-6 to T-3              | Hall design, tables, layout, décor, seating draft     |
| Detail         | T-3 months to T-2 weeks | Numbers, seating, run sheet, transport, accessibility |
| Final week     | T-7 to T-1 days         | Confirmations, fuel, weather, printouts               |
| Day-of         | The day                 | Run sheet — no due dates, offline                     |
| After          | T+1 to T+30             | Returns, thank-yous, payments, reviews                |

Collapse completed phases. Show the current phase expanded and the **next phase collapsed but visible** — the path forward must be labelled, not hidden. NN/g's progressive-disclosure guidance is explicit: keep the first level short, label the path forward, and never nest more than two levels.

### F.3 The next best action

Computed from due-date proximity, dependency satisfaction (cannot seat guests before RSVPs close) and risk weight (safety-critical first). Rendered as one card: title, why-now line, one button, and a small "not this one" control. Two competing primary actions is the most common cause of a stalled checklist.

### F.4 Progress without shame

- **Ring for the whole event, bar for the current phase.** Two metaphors, two timescales.
- **Lead with done, not remaining.** "12 of 47 done" is honest; "35 to go" is a wall.
- **Do not lean on the Zeigarnik effect.** A 2025 systematic review and meta-analysis found no memory advantage for unfinished tasks — only a tendency to resume them. Build progress as orientation, not as a motivational lever.
- **Skip streaks.** A wedding plan has a weeks-long cadence; daily streaks manufacture failure.
- **Forgive overdue.** One-tap "move all to this week". A red pile is the point at which people stop opening the app.
- **Separate critical path from nice-to-have.** A green ring with nothing booked is worse than an honest amber.
- **Progress indicators must tell the truth** — move slowly at first, never stall at the last percent.

### F.5 Generation rules

A short template (25–40 tasks) where most rows are _generated_, each with a visible "because":

| Trigger                  | Generated task                                                                        |
| ------------------------ | ------------------------------------------------------------------------------------- |
| Hall has 30 tables       | "Confirm 30 table linens", "Book 30 centrepieces", "Seat 300 guests across 30 tables" |
| Venue is outdoor/marquee | Rain plan, wind plan, side walls                                                      |
| Date in Nov–Mar          | Harmattan advisory tasks                                                              |
| Generator in the plan    | Fuel quantity, service, backup                                                        |
| Guest count > 250        | First-aider, extra security, toilet ratio                                             |
| AC units specified       | Generator load, condensate drainage, maintenance                                      |
| Buffet service           | Stations, chafing dishes, queue space                                                 |

**Explain the derivation in the row.** This is the trust mechanism; a wrong auto-task with no explanation is indistinguishable from a bug. **Never resurrect a deleted task** — deleting is a signal, not an error. **Version templates** so an update does not duplicate existing tasks.

### F.6 Collaboration

Four roles: **owner** (the couple), **editor** (planner, family), **contributor** (vendor — sees only their tasks), **viewer**. Add a **"waiting on"** state distinct from "not started": most late wedding tasks are blocked on someone else, and conflating the two makes the couple feel personally behind. Filter views — _mine / ours / waiting on / this week_ — are cheap and high-value. Batch activity into a digest, not a stream.

### F.7 Reminders, calendar, offline

- **Ask for notification permission later, not at launch.** NN/g found the immediate reaction to a first-launch prompt is "Don't Allow".
- **Default to one weekly digest**, not per-task pushes. Make the off switch obvious and in-app.
- **Calendar:** per-task due dates plus an ICS export. Do not build two-way sync before it is needed.
- **Offline matters more than usual.** Mobile sessions average ~72 seconds versus ~150 on desktop, and users are interruptible. Always save state, make resuming trivial, and design for variable connectivity. A venue with no signal is the day you most need the run sheet.

### F.8 Accessibility (WCAG 2.2)

| Requirement                                    | What it means here                                                                                                                         |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **2.5.8 Target Size (AA)**                     | 24×24 CSS px minimum. Go further: 44–48 px rows and full-row tap areas (NN/g recommends 1 cm²; MIT Touch Lab puts a fingertip at 1.6–2 cm) |
| **1.4.3 Contrast (AA)**                        | 4.5:1 body text, 3:1 for 18 pt / 14 pt bold. 4.499:1 fails                                                                                 |
| **2.5.7 Dragging (AA)**                        | Reordering by drag needs a single-pointer alternative — arrow buttons or a "move to…" menu                                                 |
| **3.3.7 Redundant Entry (A)**                  | Never re-ask the guest count. Carry it across steps                                                                                        |
| **2.4.13 Focus Appearance (AAA — aim for it)** | 2 px perimeter, 3:1 change between states                                                                                                  |

Plus: never encode done/overdue in colour alone (checkbox + strikethrough + label); announce progress politely via a live region, not on every tick; support 200 % text zoom; respect reduced motion. Write task copy at **grade 6–8**.

### F.9 Empty states, celebration, undo

- **Seed the list on first run** from the hall plan so it is never empty. NN/g: a blank panel leaves users unsure whether it is empty, loading or broken.
- **Do not run a first-launch tour.** Front-loaded tours get skipped and not remembered; prefer on-demand help attached to each step.
- **Celebrate phase completion, not every checkbox.** Confetti per tick is noise within a week.
- **Undo over confirmation.** Reversible actions get a toast with a 5-second undo; reserve dialogs for the irreversible.

### F.10 Known failure modes and counters

| Failure               | Symptom                                        | Counter                                                                         |
| --------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------- |
| Overwhelm             | 150 tasks on day one; user closes the app      | Short template + generation; only the current phase expanded                    |
| Stale tasks           | Tasks that no longer apply erode trust         | Auto-expire; "still needed?"; invalidate dependents when a parent changes       |
| Duplicate lists       | Couple, planner and family each keep their own | One list, many filtered views; edit permission rather than copies               |
| Notification fatigue  | Bursts of pings; users disable or uninstall    | Weekly digest, batching, quiet hours, obvious off switch                        |
| Guilt and abandonment | A red overdue wall                             | One-tap "move all to this week"; overdue is neutral, not red                    |
| False completeness    | Green ring, nothing booked                     | Weight tasks by criticality; show the critical path separately                  |
| Template mismatch     | Western single-ceremony assumptions            | Multi-event support — 2 ceremonies + 2 receptions is already the insurance norm |
| Wrong auto-tasks      | One bad derived task discredits the rest       | Always show the derivation; "why this?" and "don't suggest this again"          |

### F.11 Page spec

**Header:** event name · countdown · a status pill reading _on track / 3 things this week_ — never a percentage alone.

**Primary card:** the next best action (title, why-now, one button, "show me something else").

**Phase rail:** horizontal, scrollable, current phase expanded; completed phases collapsed to a line each.

**Task row:** full-row tap target ≥ 44 px · checkbox · title · meta line (owner avatar, due chip, risk dot) · optional expanded detail sheet with the mitigation text and its source.

**Filters:** mine / ours / waiting on / this week — a sticky chip row, not a drawer.

**Bottom nav on mobile**, single column, all primary actions above the fold.

**Day-of mode:** a separate, offline-first surface. No checkboxes with due dates — a run sheet with times, contacts and hard stops.

---

## Part G — Rust architecture

### G.1 What Rust should own

| Concern                                       | Language              | Why                                                                       |
| --------------------------------------------- | --------------------- | ------------------------------------------------------------------------- |
| React UI, forms, panels, 3D scene graph       | TypeScript            | It is a UI; Rust buys nothing                                             |
| Drag, snap, single-table gap checks           | TypeScript            | Already fast; wasm boundary would cost more than the work                 |
| Geometry primitives (footprint, gap, extents) | **Rust**              | Shared by solver, checks, thermal, renderer; must be identical everywhere |
| Auto-layout search                            | **Rust**              | 10⁴–10⁵ evaluations; this is the whole point                              |
| Thermal field                                 | **Rust**              | Grid solve over thousands of cells                                        |
| Catering quantities                           | **Rust**              | Pure arithmetic, but must match the checklist and the PDF export          |
| Risk rules                                    | **Rust**              | Rule engine over the plan                                                 |
| Checklist generation                          | **Rust**              | Deterministic derivation with stable keys                                 |
| Persistence, RLS, server actions              | TypeScript + Postgres | Existing stack                                                            |

### G.2 Crate layout

```
crates/
  studio-core/          # pure, no wasm, no IO
    src/
      lib.rs
      venue.rs          # VenueType, VenueProfile, environment
      geometry.rs       # footprint, gap, extents, raycast (ported from model.ts)
      layout/
        mod.rs
        archetype.rs    # the ten generators
        zones.rs        # zone placement strategies
        score.rs        # the objective and its breakdown
        search.rs       # annealing, seeded
      thermal/
        mod.rs
        load.rs         # the balance equations
        field.rs        # grid + unit influence
        units.rs        # split AC catalogue and derating
      catering.rs
      risk.rs
      checklist.rs
      wire.rs           # serde types = the JSON contract
  studio-wasm/          # cdylib, JSON in / JSON out
    src/lib.rs
```

`studio-core` depends on `render-core` for `XorShift32` and `hash_str`, so the seeded search and the renderer share one RNG.

### G.3 The wasm ABI

The existing `render-wasm` uses a hand-rolled C ABI with `f64` buffers. That is right for a handful of scalars and wrong for a venue document. Use **JSON over a length-prefixed buffer**:

```rust
#[no_mangle]
pub extern "C" fn ariya_studio_call(op: u32, ptr: *const u8, len: u32) -> u64
// returns (ptr << 32) | len for the response buffer; caller frees with ariya_free
```

Ops: `ARRANGE`, `SCORE`, `THERMAL`, `CATERING`, `RISK`, `CHECKLIST`, `VERSION`. One call per user action; no chatty round-trips.

**Cost:** `serde_json` adds roughly 100–200 KB to the wasm. Acceptable against the value. Do not reach for `rkyv` or `miniserde` until profiling says otherwise.

### G.4 Type safety across the boundary

The failure mode to avoid is the one already recorded in this repo: hand-extended types drifting from the generated ones. Define the wire types **once** in Rust with `serde`, and generate TypeScript with `ts-rs` (or `typeshare`) into `packages/studio/src/generated.ts`. CI fails if the generated file is stale. The TS side then imports the generated types and never hand-writes them.

### G.5 Loader and fallback

Mirror `packages/render`:

```
packages/studio/src/index.ts   # loadStudio(), typed wrappers, no raw ABI
```

- Load lazily, only on the seating route.
- If the wasm fails to load, **degrade to the existing TypeScript implementation** for geometry and checks, and hide the features that need Rust (auto-layout options, thermal, catering). Never show a broken page.
- Keep the artifact committed, as `build-wasm.mjs` already does, so Vercel needs only Node.

### G.6 Migration: strangler, not rewrite

1. **Port geometry first** (`footprint`, `gapBetween`, `extents`, `gapToZone`, `gapToWalls`) to `studio-core/geometry.rs`, with parity tests against the TS implementation on a generated corpus. This is the foundation everything else uses.
2. **Port `fitTables` and `checkHallPlacement`**, again with parity tests. At this point the Rust core can reproduce today's behaviour exactly.
3. **Add the archetypes and the scorer** behind a flag. The UI can switch between "current" and "new" layouts for comparison.
4. **Add thermal, catering, risk, checklist** as new ops — no migration needed, they are new.
5. **Retire the TS geometry** only when the Rust path has run in production for a release and the parity suite is green.

This keeps the existing tests meaningful and avoids a big-bang rewrite of a feature users depend on.

### G.7 Performance budget

| Operation                                 | Target   |
| ----------------------------------------- | -------- |
| Full auto-arrange (300 tables, 3 options) | < 150 ms |
| Re-score one layout                       | < 5 ms   |
| Thermal field (600 m² at 0.5 m grid)      | < 30 ms  |
| Catering + risk + checklist               | < 10 ms  |
| wasm download (gzipped)                   | < 250 KB |

If the arrange exceeds the budget, reduce annealing iterations before reducing archetypes — the archetype diversity is what the user sees.

### G.8 Why Rust is the right call here — and its cost

**For:** the search is the product; determinism is testable; the same core can serve the mobile app later via UniFFI; the domain model gets real types instead of stringly-typed JSON; the repo already has the pipeline and the parity-testing habit.

**Against:** a second toolchain in CI, a committed binary artifact, a serialisation boundary to design, and a debugging story that is worse than TypeScript's. None of these are reasons not to do it; they are reasons to do it incrementally, with the TS fallback in place.

**What Rust does not fix:** usability. A fast wrong answer is still wrong. Parts H and I are where the "easily used by technical or non-technical persons" ask is actually answered.

---

## Part H — Data model

### H.1 Keep geometry in `hall_layout`, add a venue profile

`events.hall_layout` (jsonb, ≤ 64 KB) stays the geometry document. Extend it with a `venue` object rather than adding columns for every fact:

```jsonc
{
  "version": 2,
  "venue": {
    "type": "marquee", // hall | pillared-hall | marquee | pole-tent | stretch-tent
    // | garden | field | beach | rooftop | church | hybrid
    "environment": "outdoor", // indoor | covered | outdoor
    "structure": {
      "clearspan": 20,
      "legModule": 5,
      "designWindMph": 60,
      "anchoring": "kentledge",
      "floor": "deck",
    },
    "services": {
      "power": "generator",
      "generatorKva": 100,
      "water": "tanker",
      "toilets": 12,
      "parking": 150,
    },
    "capacity": { "certified": 400, "source": "venue certificate" },
    "climate": { "city": "Lagos", "month": 11, "outdoorC": 33, "rh": 0.8 },
    "sun": { "azimuth": 250, "elevation": 12 },
    "wind": { "direction": 210, "speedMph": 8 },
  },
  "ac": [
    {
      "id": "ac1",
      "hp": 2.5,
      "x": 3,
      "y": 2,
      "mount": "wall",
      "inverter": true,
    },
  ],
  "width": 30,
  "length": 20,
  "ceiling": 5,
  "zones": [],
  "decor": {},
  "rotations": {},
  "tableStyles": {},
  "chairs": [],
  "spacing": "comfortable",
  "mood": "day",
  "chandeliers": false,
}
```

`normaliseLayout` already tolerates missing fields; add `venue` with a default of `{ type: "hall", environment: "indoor" }` so every existing document keeps working.

### H.2 New table: `tasks`

The checklist needs querying, collaboration and RLS — jsonb is the wrong tool.

```sql
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  title text not null,
  detail text,
  phase text not null check (phase in
    ('foundations','book','build','detail','final','day','after')),
  due_date date,
  status text not null default 'todo'
    check (status in ('todo','waiting','done','skipped')),
  owner_id uuid references public.profiles(id) on delete set null,
  source text not null default 'manual'
    check (source in ('template','generated','manual')),
  -- stable key so regeneration is idempotent and never duplicates
  source_key text,
  -- why this task exists: { "kind": "tables", "count": 30 }
  derivation jsonb,
  sort integer not null default 0,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, source_key)
);
```

RLS follows the existing pattern: members read; owner and planner write; a `contributor` role (if added) sees only rows where `owner_id = auth.uid()`.

### H.3 Derived, not stored

Catering, thermal and risk are **computed on read** from the event + layout. Store only user overrides (e.g. "we decided on 320 portions"). This avoids a second source of truth and keeps the numbers honest when the guest list changes.

---

## Part I — Usability for technical and non-technical users

### I.1 Two modes

**Simple mode** — six questions, one plan:

1. What kind of venue? (picture cards, not a dropdown)
2. How many guests?
3. Seated dinner, cocktail, or ceremony?
4. Indoor, covered, or open air?
5. What time of day?
6. Will you serve alcohol? (and: is the cake dessert or decoration?)

Output: a plan, three layout options, a temperature verdict, a shopping list, and a checklist — each with a "how we got this" disclosure.

**Studio mode** — everything the current page has, plus venue facts, AC units, and the analysis panels.

The mode switch is a single control in the header. Both write the same document, so a user can start simple and graduate.

### I.2 Plain language

| Instead of                           | Say                                                                            |
| ------------------------------------ | ------------------------------------------------------------------------------ |
| "Occupant load factor 1.4 m²/person" | "Each seated guest needs about 1.4 m² — that's 300 guests in a 30 × 20 m hall" |
| "SHR 0.58 vs unit SHR 0.75"          | "These units will make the room cold but still damp"                           |
| "Infiltration 1.0 ACH"               | "How draughty is the room? (doors open most of the evening)"                   |
| "Latent load 55 kW"                  | "About half the cooling has to go on removing moisture, not heat"              |
| "Egress distance 24 m"               | "Nobody should be more than 24 m from an exit"                                 |

### I.3 Explainability

Every derived number gets a disclosure with three parts: **the inputs**, **the rule**, **the source**. Example:

> **Why 19 units?**
> 300 guests produce 49 kW of heat; the glass adds 16 kW; the roof and walls 10 kW; outside air leaking in adds 44 kW — 35 kW of that is moisture. Total 130 kW. A 2.5 HP unit removes 7 kW, so 19 are needed. At that size, split units are not the right choice — see the note below.

### I.4 Progressive disclosure

- The first screen shows the plan and one number per feature.
- Details open in a sheet, not a new page.
- Never nest more than two levels.
- The "next best action" is always one card.

### I.5 Accessibility and mobile

The existing bar is WCAG 2.2 AA with axe in CI (`e2e/09-accessibility.spec.ts`). The new surfaces must meet it: 44 px targets, 4.5:1 contrast, keyboard alternatives for every drag, live-region progress announcements, reduced motion, 200 % zoom. The 3D canvas needs a **non-visual equivalent**: a table list with the same information, and a text summary of the layout ("28 tables, 280 seats, 12 m to the nearest exit").

### I.6 The 3D view

Extend `hall3d.js` with:

- **Venue shells:** hall, marquee (with leg grid and fabric), garden (grass, trees, sky), field, beach, rooftop, church.
- **Environment:** sun position from date/time/location, sky gradient, wind direction indicator, rain toggle.
- **Overlays:** temperature heat map, sightline cones, egress paths, aisle widths.
- **Weather plan toggle:** show the indoor fallback.

Keep the renderer in its iframe and pass it the same JSON document. Do not let it become a second model.

---

## Part J — Delivery plan

| Phase              | Work                                                                                                                   | Outcome                                                                  |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| **0. Foundations** | `studio-core` crate, geometry port, parity tests, `studio-wasm` JSON ABI, `packages/studio` loader, generated TS types | Rust core reproduces today's behaviour exactly                           |
| **1. Venue model** | `VenueType`, `VenueProfile`, `normaliseLayout` v2, venue picker in Simple mode, venue shells in the renderer           | The studio can describe a marquee, garden, field, beach, rooftop, church |
| **2. Auto-layout** | Archetypes, zone strategies, scorer, annealing, ranked options UI                                                      | Three explainable options instead of one                                 |
| **3. Thermal**     | Load model, unit catalogue, field solve, heat-map overlay, verdict copy                                                | "It will be 29 °C and damp; splits won't fix it"                         |
| **4. Catering**    | Quantity engine, Low/Likely/High, toggles, shopping list, PDF export                                                   | A list the user can take to a caterer                                    |
| **5. Risk**        | Rule engine, register, severity, "when to act"                                                                         | Specific, dated advice                                                   |
| **6. Checklist**   | `tasks` table, RLS, generation, phases, next-best-action, day-of mode                                                  | One place to track everything                                            |
| **7. Polish**      | Simple mode, explainability sheets, accessibility pass, e2e                                                            | Usable by a non-technical couple on a phone                              |

Phases 1–2 are the core of the ask. Phases 3–6 each depend on the plan being trustworthy, so they follow.

---

## Part K — Testing

- **Rust unit tests** for every formula, with the worked examples in this document as golden cases (130.5 kW, SHR 0.58, 92 kg jollof, 270 kg ice).
- **Parity tests** between `studio-core` and the TS implementation during migration, on a generated corpus of layouts.
- **Snapshot tests** for the wire format, so a schema change is a visible diff.
- **Property tests** for the solver: no overlaps, all tables inside walls, deterministic for a given seed.
- **Vitest** for the TS wrappers and the UI logic.
- **Playwright** for the flows: pick a venue, auto-arrange, compare options, place an AC, read the verdict, generate the checklist, tick a task.
- **axe** on every new page at 1440 and 390.
- **Performance test** in CI: arrange a 300-table hall and assert < 150 ms.

---

## Part L — Open questions

1. **Do we ship one market or many?** The compliance rows (fire, insurance) are England/Wales; the power and harmattan rows are Nigerian. If the product is Nigeria-first, replace the compliance rows with Lagos State Safety Commission guidance and venue certificates.
2. **Do we model the ceremony and the reception as one event or two?** The insurance market already treats "2 ceremonies + 2 receptions" as normal. The data model should allow it before the UI does.
3. **How much of the thermal model do we expose?** A full psychrometric model is out of scope; the screening model is defensible if labelled as such. Decide whether to show the SHR verdict to everyone or only in Studio mode.
4. **Do we store catering overrides?** Recommended: yes, as a small jsonb on the event, so a user can say "we decided 320 portions" without the number changing under them.
5. **What is the offline story for day-of?** A service worker with the run sheet cached is the minimum; decide before the checklist ships.
6. **Do we need a `contributor` role?** It is the right model for vendors, but it is a schema and RLS change. Decide before the checklist ships.

---

## Appendix — constants to put in `studio-core`

| Constant                  | Value                     | Unit                 |
| ------------------------- | ------------------------- | -------------------- |
| `AREA_PER_DINER`          | 1.4                       | m²                   |
| `AREA_PER_THEATRE`        | 0.65                      | m²                   |
| `AREA_PER_STANDING`       | 0.55                      | m²                   |
| `DANCE_FLOOR_PER_DANCER`  | 0.42                      | m²                   |
| `DANCE_FLOOR_OCCUPANCY`   | 0.45                      | share of guests      |
| `CHAIR_DEPTH`             | 0.5                       | m                    |
| `WALL_MARGIN`             | 1.0                       | m                    |
| `ZONE_CLEARANCE`          | 1.0                       | m                    |
| `MAIN_AISLE`              | 1.12                      | m                    |
| `ACCESSIBLE_ROUTE`        | 0.91                      | m                    |
| `MAX_EGRESS_DISTANCE`     | 24                        | m                    |
| `EXIT_UNIT_WIDTH`         | 0.525                     | m                    |
| `EXIT_FLOW`               | 40                        | persons/unit/min     |
| `PEOPLE_SENSIBLE_SEATED`  | 70                        | W                    |
| `PEOPLE_LATENT_SEATED`    | 35                        | W                    |
| `PEOPLE_SENSIBLE_DANCING` | 150                       | W                    |
| `PEOPLE_LATENT_DANCING`   | 130                       | W                    |
| `HP_TO_KW`                | 2.64                      | kW                   |
| `HP_TO_BTU`               | 9000                      | BTU/h                |
| `AC_DERATE`               | 0.12                      | fraction             |
| `SPLIT_SHR`               | 0.75                      | —                    |
| `TARGET_C`                | 24                        | °C                   |
| `TARGET_RH`               | 0.55                      | —                    |
| `ACH_HALL`                | 1.0                       | 1/h                  |
| `ACH_MARQUEE`             | 5.0                       | 1/h                  |
| `OVERAGE_BY_SIZE`         | 0.25 / 0.15 / 0.10 / 0.08 | —                    |
| `VENDOR_MEALS`            | 0.08                      | share of guests      |
| `PLUS_ONE_RATE`           | 0.12                      | share of guests      |
| `TAKEAWAY_RATE`           | 0.15                      | share of main course |
| `ICE_HOT_CLIMATE`         | 0.9                       | kg/guest             |

---

## Sources

**Venue and space planning**

- IBC Table 1004.5 (occupant load factors) and Table 1006.2.1 (two exits above 49 occupants)
- UK Approved Document B Vol 2, Table 2.2 (floor space factors)
- MUTA Best Practice Guide — https://www.muta.org.uk/wp-content/uploads/2022/07/MUTAs-Best-Practice-Guide.pdf
- ADA 403.5.1 (accessible route 36 in)
- IBC 1018.2 (aisle accessways)
- SeatPlanning, table spacing — https://www.seatplanning.com/blog/event-table-spacing-standards
- Rosevow, dance floor sizing — https://rosevow.com/reception/wedding-dance-floor-size
- PandaTaps, banquet table sizes — https://pandataps.com/seating-chart/guides/banquet-table-sizes-chart
- Chelford Mobile Services, toilet provision — https://www.chelfordmobileservices.co.uk/blog/health-safety-outdoor-events-toilet-provision-guidelines
- Northamptonshire FRS, ADB floor space factors — https://www.northantsfire.gov.uk/floor-space-factors/
- Lagos State Safety Commission, event safety — https://www.lasgsafety.com/event-and-hospitality-safety
- ElitePlanners, Lagos venue capacities — https://eliteplanners.ng/blog/lagos-event-center-prices-2026
- Wikipedia, money spraying — https://en.wikipedia.org/wiki/Money_spraying

**Thermal**

- ASHRAE Standard 55 — https://www.ashrae.org/technical-resources/bookstore/standard-55-thermal-comfort
- ASHRAE 55 overview — https://en.wikipedia.org/wiki/ASHRAE_55
- Thermal comfort, PMV/PPD — https://en.wikipedia.org/wiki/Thermal_comfort
- ISO 7730 — https://www.iso.org/standard/39155.html
- Cooling load — https://en.wikipedia.org/wiki/Cooling_load
- Ton of refrigeration — https://en.wikipedia.org/wiki/Ton_of_refrigeration
- Air conditioning — https://en.wikipedia.org/wiki/Air_conditioning
- SEER — https://en.wikipedia.org/wiki/Seasonal_energy_efficiency_ratio
- Psychrometrics — https://en.wikipedia.org/wiki/Psychrometrics
- Evaporative cooling — https://en.wikipedia.org/wiki/Evaporative_cooler
- Passive House benchmarks — https://en.wikipedia.org/wiki/Passive_house
- Air change rates — https://www.engineeringtoolbox.com/air-change-rate-d_882.html
- Lagos climate — https://en.wikipedia.org/wiki/Lagos

**Risk**

- Crowd collapses and crushes — https://en.wikipedia.org/wiki/Crowd_collapses_and_crushes
- Emergency exit — https://en.wikipedia.org/wiki/Emergency_exit
- Harmattan — https://en.wikipedia.org/wiki/Harmattan
- Electricity sector in Nigeria — https://en.wikipedia.org/wiki/Electricity_sector_in_Nigeria
- WHO, food safety — https://www.who.int/news-room/fact-sheets/detail/food-safety
- WHO, heat and health — https://www.who.int/news-room/fact-sheets/detail/climate-change-heat-and-health
- GOV.UK, fire safety risk assessment: open-air events — https://www.gov.uk/government/publications/fire-safety-risk-assessment-open-air-events-and-venues
- money.co.uk, wedding insurance — https://www.money.co.uk/wedding-insurance.htm
- WeddingPlan Insurance — https://www.weddingplaninsurance.co.uk/

**Checklist UX**

- NN/g, progressive disclosure — https://www.nngroup.com/articles/progressive-disclosure/
- NN/g, empty states — https://www.nngroup.com/articles/empty-state-interface-design/
- NN/g, onboarding tutorials — https://www.nngroup.com/articles/onboarding-tutorials/
- NN/g, plain language — https://www.nngroup.com/articles/plain-language-expert-lay-audiences/
- NN/g, progress indicators — https://www.nngroup.com/articles/progress-indicators/
- NN/g, touch target size — https://www.nngroup.com/articles/touch-target-size/
- NN/g, push notifications — https://www.nngroup.com/articles/push-notification/
- NN/g, mobile UX — https://www.nngroup.com/articles/mobile-ux/
- NN/g, ten usability heuristics — https://www.nngroup.com/articles/ten-usability-heuristics/
- WCAG 2.2 target size — https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
- WCAG 2.2 contrast — https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html
- WCAG 2.2 dragging — https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html
- WCAG 2.2 redundant entry — https://www.w3.org/WAI/WCAG22/Understanding/redundant-entry.html
- WCAG 2.2 focus appearance — https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html
- Zeigarnik effect — https://en.wikipedia.org/wiki/Zeigarnik_effect

**Catering — caveat**

The catering figures are drawn from established trade practice and published guidance, but the research session could not verify most source URLs live (The Knot, Spruce Eats, USDA, NHS and others returned 403/404). Treat the per-guest rates as **defensible estimates with a ±20 % band**, not as cited standards. The structural findings — overage scaling, the three high-leverage questions, takeaway packs, vendor meals — are the parts to rely on. Spot-check before publishing any figure as sourced.

- Wikipedia, jollof rice — https://en.wikipedia.org/wiki/Jollof_rice
- Wikipedia, suya — https://en.wikipedia.org/wiki/Suya
- Wikipedia, catering — https://en.wikipedia.org/wiki/Catering
- Wikipedia, wedding cake — https://en.wikipedia.org/wiki/Wedding_cake
