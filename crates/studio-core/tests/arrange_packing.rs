//! The arrange has to pack a real hall, not just a bare rectangle.
//!
//! A dance floor in the middle of the room used to cost the lattice whole rows: the search placed
//! 12 of 25 tables and ranked the sparsest layout first, because fewer tables meant better
//! sightlines. These cases pin the packing and the ranking.

use ariya_studio_core::archetype::ArrangeTable;
use ariya_studio_core::search::{search, SearchInput};
use ariya_studio_core::venue::{Zone, ZoneKind, ZoneShape};

/// A 30 × 20 m hall with a stage, a dance floor in the middle, a buffet, a bar and an entrance —
/// the shape of the seeded event.
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
            shape: Some(ZoneShape::Round),
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
            rot: Some(0.0),
        },
        Zone {
            id: "bar".into(),
            kind: ZoneKind::Bar,
            label: "Bar".into(),
            x: 28.8,
            y: 11.0,
            w: 1.4,
            h: 5.0,
            shape: None,
            rot: Some(0.0),
        },
        Zone {
            id: "entrance".into(),
            kind: ZoneKind::Entrance,
            label: "Entrance".into(),
            x: 15.0,
            y: 19.4,
            w: 3.4,
            h: 1.0,
            shape: None,
            rot: Some(0.0),
        },
    ]
}

/// One head table and a mix of round tens and eights, as the seeded event has.
fn tables() -> Vec<ArrangeTable> {
    let mut t = vec![ArrangeTable {
        id: "head".into(),
        shape: "head".into(),
        capacity: 10,
        occupied: 0,
    }];
    for i in 0..12 {
        t.push(ArrangeTable {
            id: format!("r10-{i}"),
            shape: "round".into(),
            capacity: 10,
            occupied: 0,
        });
    }
    for i in 0..12 {
        t.push(ArrangeTable {
            id: format!("r8-{i}"),
            shape: "round".into(),
            capacity: 8,
            occupied: 0,
        });
    }
    t
}

#[test]
fn a_dance_floor_does_not_cost_the_lattice_most_of_the_room() {
    let t = tables();
    let z = hall();
    let input = SearchInput::new(30.0, 20.0, &z, &t, 0.6, None, 1);
    let opts = search(&input);
    let best = opts.first().expect("at least one option");
    assert!(
        best.placements.len() >= 16,
        "the best option should seat most of the room, placed {} of {}",
        best.placements.len(),
        t.len()
    );
}

#[test]
fn the_options_are_three_different_shapes() {
    let t = tables();
    let z = hall();
    let input = SearchInput::new(30.0, 20.0, &z, &t, 0.6, None, 1);
    let opts = search(&input);
    let shapes: std::collections::HashSet<&str> =
        opts.iter().map(|o| o.archetype.as_str()).collect();
    assert_eq!(
        shapes.len(),
        opts.len(),
        "the cards should be different shapes"
    );
}

#[test]
fn the_sparsest_layout_is_not_ranked_first() {
    let t = tables();
    let z = hall();
    let input = SearchInput::new(30.0, 20.0, &z, &t, 0.6, None, 1);
    let opts = search(&input);
    let placed: Vec<usize> = opts.iter().map(|o| o.placements.len()).collect();
    assert!(
        placed[0] >= *placed.iter().max().expect("options"),
        "the first card should place at least as many tables as any other, got {placed:?}"
    );
}
