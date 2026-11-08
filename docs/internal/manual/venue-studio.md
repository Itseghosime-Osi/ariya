# Venue studio

Auto-layout, cooling, catering quantities, risk advice and a generated checklist.

Audience: Hosts, planners, engineers

> Archived from the former public manual. Internal reference only; content reflects the product at the time it was archived.

The studio's decks sit beside the hall. They all run on one Rust engine (`crates/studio-core`, loaded as WebAssembly), so a browser, an AI call and a test produce identical numbers. If the engine cannot load, the hall falls back to simple TypeScript geometry and the engine decks are hidden with a quiet note.

## What it calculates

| Deck      | What you get                                                                                                                                                                      |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Layout    | Archetypes (rows, banquet, cabaret and more) × scoring × a seeded search that returns the same three options on every device. Scores consider sightlines, circulation and service |
| Thermal   | Heat load from guests, lighting, kitchen and sun, then split-AC sizing and placement with a heat map. Marquees and outdoor venues are treated separately                          |
| Catering  | Food and drink per guest for a Nigerian menu, with overage that scales inversely with headcount and the multipliers most calculators miss                                         |
| Risk      | A register of hazards (fire, weather, crowding and more) with a mitigation and a source for each rating                                                                           |
| Checklist | A dated task list generated from the plan. See [Checklist](checklist.md)                                                                                                          |

## Venue types and space

The questions asked depend on the venue type (hall, marquee, outdoor and so on). Space per guest, clearances, table conventions, fire and life-safety rules, weather and West African practice are in the research document, `docs/research/2026-11-05-venue-studio.md`.

> Honest framing: Catering and cooling figures are planning estimates, not a quote or an engineer's design. Where the engine deliberately differs from the research text, a test records why (for example `the_research_table_is_lower_than_its_own_formula`).

## For engineers

See [Design engine and studio engine](design-engine.md) and ADR 0005 in [Decisions](decisions.md). A parity corpus of 693 cases keeps the TypeScript geometry and the Rust engine in step.
