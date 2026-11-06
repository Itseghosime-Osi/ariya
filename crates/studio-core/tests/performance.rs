//! The performance budgets from research Part K and the phase 7 checklist (7.6).
//!
//! These are wall-clock assertions in a test binary, which is a blunt instrument: a loaded CI
//! runner is slower than the machine the budget was written for, and a debug build is much slower
//! than the release wasm the host actually runs. So the assertions are deliberately loose — they
//! catch a change that makes the search an order of magnitude slower, not a 20 % regression — and
//! the budgets they encode are the ones a release build must meet.

use std::time::Instant;

use ariya_studio_core::archetype::ArrangeTable;
use ariya_studio_core::search::{search, LayoutOption, SearchInput};
use ariya_studio_core::venue::{Zone, ZoneKind};

/// The 300-guest reception from research §E.10: a 30 × 20 m hall with a stage, a dance floor, a
/// buffet, a bar and an entrance. The same shape the packing tests use.
fn hall() -> Vec<Zone> {
    vec![
        Zone {
            id: "stage".into(),
            kind: ZoneKind::Stage,
            label: "Stage".into(),
            x: 15.0,
            y: 2.3,
            w: 9.0,
            h: 3.6,
            shape: None,
            rot: Some(0.0),
        },
        Zone {
            id: "dance".into(),
            kind: ZoneKind::Dance,
            label: "Dance".into(),
            x: 15.0,
            y: 10.3,
            w: 8.0,
            h: 6.0,
            shape: None,
            rot: None,
        },
        Zone {
            id: "buffet".into(),
            kind: ZoneKind::Buffet,
            label: "Buffet".into(),
            x: 1.3,
            y: 11.0,
            w: 1.6,
            h: 8.0,
            shape: None,
            rot: None,
        },
        Zone {
            id: "bar".into(),
            kind: ZoneKind::Bar,
            label: "Bar".into(),
            x: 28.0,
            y: 11.0,
            w: 1.4,
            h: 6.0,
            shape: None,
            rot: None,
        },
        Zone {
            id: "entrance".into(),
            kind: ZoneKind::Entrance,
            label: "Entrance".into(),
            x: 15.0,
            y: 19.0,
            w: 3.0,
            h: 1.0,
            shape: None,
            rot: None,
        },
    ]
}

/// 300 seats: a head table of 10 and 29 round tables of 10.
fn tables() -> Vec<ArrangeTable> {
    let mut t = vec![ArrangeTable {
        id: "head".into(),
        shape: "head".into(),
        capacity: 10,
        occupied: 0,
    }];
    for i in 0..29 {
        t.push(ArrangeTable {
            id: format!("r10-{i}"),
            shape: "round".into(),
            capacity: 10,
            occupied: 0,
        });
    }
    t
}

fn input<'a>(zones: &'a [Zone], tables: &'a [ArrangeTable]) -> SearchInput<'a> {
    SearchInput::new(30.0, 20.0, zones, tables, 0.9, Some(300), 0x5eed)
}

#[test]
fn a_300_table_arrange_returns_three_options() {
    let zones = hall();
    let tables = tables();
    let options = search(&input(&zones, &tables));

    assert_eq!(options.len(), 3, "the host is always offered three options");
    // A shortfall is a modelled outcome, not a fault — a 30 × 20 m room with a stage and a dance
    // floor genuinely cannot seat 300 (see arrange_packing.rs). What must hold is that the search
    // accounts for every table: each is either placed or reported as unplaced, and the first card
    // offers the most room. A fast search that silently drops tables would pass a bare timing check
    // and be worthless.
    for (i, option) in options.iter().enumerate() {
        assert_eq!(
            option.placements.len() + option.unplaced.len(),
            tables.len(),
            "option {i} accounts for every table"
        );
    }
    // The three options are one per archetype, kept for diversity rather than ranked purely on
    // how many tables they fit — see arrange_packing.rs, which pins the ranking it does promise.
    assert!(
        options.iter().any(|o| !o.placements.is_empty()),
        "at least one option should seat someone"
    );
}

#[test]
fn a_300_table_arrange_stays_within_its_budget() {
    let zones = hall();
    let tables = tables();
    let request = input(&zones, &tables);

    // One warm-up run, so page faults and lazily-built statics are not charged to the measurement.
    let _ = search(&request);

    let start = Instant::now();
    let options = search(&request);
    let elapsed = start.elapsed();

    assert_eq!(options.len(), 3);

    // The budget is 150 ms in a release build (research Part K). A debug build runs the same
    // arithmetic an order of magnitude slower, so the ceiling here is generous on purpose: it
    // catches an algorithmic blow-up, not micro-regressions.
    let ceiling_ms = if cfg!(debug_assertions) { 2000 } else { 150 };
    assert!(
        elapsed.as_millis() < ceiling_ms,
        "a 300-table arrange took {elapsed:?}, over the {ceiling_ms} ms budget \
         (release budget: 150 ms)"
    );
}

#[test]
fn the_search_is_deterministic_for_a_seed() {
    let zones = hall();
    let tables = tables();
    let request = input(&zones, &tables);

    let first = search(&request);
    let second = search(&request);

    // Same seed, same plan: a host who reloads must not be shown a different hall, and the perf
    // test above would otherwise be measuring different work each run.
    let ids = |opts: &[LayoutOption]| {
        opts.iter()
            .map(|o| {
                o.placements
                    .iter()
                    .map(|p| (p.table, p.x, p.y))
                    .collect::<Vec<_>>()
            })
            .collect::<Vec<_>>()
    };
    assert_eq!(ids(&first), ids(&second));
}
